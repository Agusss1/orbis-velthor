const { validationResult } = require('express-validator');
const { query } = require('../../config/database');
const { success, created, error } = require('../../utils/response');
const { getIO } = require('../../config/socket');

exports.listChannels = async (req, res) => {
  const isAdmin = ['owner', 'super_admin'].includes(req.user.role);
  try {
    const result = await query(
      `SELECT c.*, u.full_name as created_by_name,
              (SELECT COUNT(*) FROM messages WHERE channel_id = c.id) as message_count,
              (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) as member_count,
              cm.last_read_at,
              (SELECT COUNT(*) FROM messages m WHERE m.channel_id = c.id AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')) as unread_count
       FROM channels c
       JOIN users u ON u.id = c.created_by
       LEFT JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = $1
       WHERE ${isAdmin ? '1=1' : '(cm.user_id = $1 OR c.is_private = FALSE)'}
       ORDER BY c.updated_at DESC`,
      [req.user.id]
    );
    return success(res, result.rows);
  } catch {
    return error(res, 'Failed to list channels');
  }
};

exports.createChannel = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 400, errors.array());

  const { name, description, type = 'area', area_id, is_private = false } = req.body;
  try {
    const result = await query(
      `INSERT INTO channels (name, description, type, area_id, is_private, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || null, type, area_id || null, is_private, req.user.id]
    );
    const channel = result.rows[0];

    await query(
      'INSERT INTO channel_members (channel_id, user_id, role) VALUES ($1, $2, $3)',
      [channel.id, req.user.id, 'admin']
    );

    return created(res, channel, 'Channel created');
  } catch {
    return error(res, 'Failed to create channel');
  }
};

exports.getChannel = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, u.full_name as created_by_name,
              (SELECT json_agg(jsonb_build_object('id', u2.id, 'full_name', u2.full_name, 'role', cm2.role))
               FROM channel_members cm2 JOIN users u2 ON u2.id = cm2.user_id
               WHERE cm2.channel_id = c.id) as members
       FROM channels c
       JOIN users u ON u.id = c.created_by
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'Channel not found', 404);
    return success(res, result.rows[0]);
  } catch {
    return error(res, 'Failed to get channel');
  }
};

exports.joinChannel = async (req, res) => {
  try {
    await query(
      'INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    return success(res, null, 'Joined channel');
  } catch {
    return error(res, 'Failed to join channel');
  }
};

exports.leaveChannel = async (req, res) => {
  try {
    await query('DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    return success(res, null, 'Left channel');
  } catch {
    return error(res, 'Failed to leave channel');
  }
};

exports.addMember = async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return error(res, 'user_id required', 400);
  try {
    await query(
      'INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, user_id]
    );
    return success(res, null, 'Member added');
  } catch {
    return error(res, 'Failed to add member');
  }
};

exports.listMessages = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const result = await query(
      `SELECT m.*, u.full_name, u.avatar_url,
              (SELECT json_build_object('id', rm.id, 'content', rm.content, 'full_name', ru.full_name)
               FROM messages rm JOIN users ru ON ru.id = rm.user_id
               WHERE rm.id = m.reply_to) as reply_to_msg
       FROM messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.channel_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    // Update last_read_at
    await query(
      'UPDATE channel_members SET last_read_at = NOW() WHERE channel_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    return success(res, result.rows);
  } catch {
    return error(res, 'Failed to get messages');
  }
};

exports.sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 400, errors.array());

  const { content, reply_to } = req.body;
  try {
    const result = await query(
      `INSERT INTO messages (channel_id, user_id, content, reply_to)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, content, reply_to || null]
    );
    const msg = { ...result.rows[0], full_name: req.user.full_name };

    await query('UPDATE channels SET updated_at = NOW() WHERE id = $1', [req.params.id]);

    try {
      getIO().to(`channel:${req.params.id}`).emit('channel:message', msg);
    } catch {}

    return created(res, msg, 'Message sent');
  } catch {
    return error(res, 'Failed to send message');
  }
};

exports.editMessage = async (req, res) => {
  const { content } = req.body;
  if (!content) return error(res, 'content required', 400);
  try {
    const result = await query(
      `UPDATE messages SET content = $1, is_edited = TRUE, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [content, req.params.msgId, req.user.id]
    );
    if (!result.rows[0]) return error(res, 'Message not found or not yours', 404);

    try {
      getIO().to(`channel:${req.params.id}`).emit('channel:message_edited', result.rows[0]);
    } catch {}

    return success(res, result.rows[0], 'Message edited');
  } catch {
    return error(res, 'Failed to edit message');
  }
};

exports.deleteMessage = async (req, res) => {
  const isAdmin = ['owner', 'super_admin'].includes(req.user.role);
  try {
    const condition = isAdmin ? 'id = $1' : 'id = $1 AND user_id = $2';
    const params = isAdmin ? [req.params.msgId] : [req.params.msgId, req.user.id];
    await query(`DELETE FROM messages WHERE ${condition}`, params);

    try {
      getIO().to(`channel:${req.params.id}`).emit('channel:message_deleted', { id: req.params.msgId });
    } catch {}

    return success(res, null, 'Message deleted');
  } catch {
    return error(res, 'Failed to delete message');
  }
};
