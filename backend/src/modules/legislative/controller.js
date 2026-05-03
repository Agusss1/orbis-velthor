const { validationResult } = require('express-validator');
const { query } = require('../../config/database');
const { success, created, error, paginated } = require('../../utils/response');
const { auditLog } = require('../../middleware/logger');
const { getIO } = require('../../config/socket');

exports.list = async (req, res) => {
  const { page = 1, limit = 20, status, area_id, search } = req.query;
  const offset = (page - 1) * limit;
  let conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (status) { conditions.push(`e.status = $${idx++}`); params.push(status); }
  if (area_id) { conditions.push(`e.area_id = $${idx++}`); params.push(area_id); }
  if (search) { conditions.push(`e.title ILIKE $${idx++}`); params.push(`%${search}%`); }

  const where = conditions.join(' AND ');
  try {
    const countRes = await query(`SELECT COUNT(*) FROM expedientes e WHERE ${where}`, params);
    const result = await query(
      `SELECT e.*, u.full_name as created_by_name, a.name as area_name,
              (SELECT COUNT(*) FROM expediente_messages WHERE expediente_id = e.id) as message_count,
              (SELECT json_agg(jsonb_build_object('id', u2.id, 'full_name', u2.full_name))
               FROM expediente_assignees ea2 JOIN users u2 ON u2.id = ea2.user_id
               WHERE ea2.expediente_id = e.id) as assignees
       FROM expedientes e
       JOIN users u ON u.id = e.created_by
       LEFT JOIN areas a ON a.id = e.area_id
       WHERE ${where}
       ORDER BY e.updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    return paginated(res, result.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch {
    return error(res, 'Failed to list expedientes');
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 400, errors.array());

  const { title, description, area_id, status = 'draft' } = req.body;
  try {
    const result = await query(
      `INSERT INTO expedientes (title, description, area_id, status, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description || null, area_id || null, status, req.user.id]
    );
    const exp = result.rows[0];

    await query(
      `INSERT INTO expediente_timeline (expediente_id, user_id, action, description)
       VALUES ($1, $2, 'Created', $3)`,
      [exp.id, req.user.id, `Expediente created by ${req.user.full_name}`]
    );

    await auditLog(req.user.id, 'create', 'expedientes', exp.id, `Created: ${title}`, {}, req);
    return created(res, exp, 'Expediente created');
  } catch {
    return error(res, 'Failed to create expediente');
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, u.full_name as created_by_name, a.name as area_name,
              (SELECT json_agg(jsonb_build_object('id', u2.id, 'full_name', u2.full_name, 'email', u2.email, 'role', u2.role))
               FROM expediente_assignees ea JOIN users u2 ON u2.id = ea.user_id
               WHERE ea.expediente_id = e.id) as assignees,
              (SELECT json_agg(jsonb_build_object('id', d.id, 'title', d.title) ORDER BY ed.linked_at DESC)
               FROM expediente_documents ed JOIN documents d ON d.id = ed.document_id
               WHERE ed.expediente_id = e.id) as documents
       FROM expedientes e
       JOIN users u ON u.id = e.created_by
       LEFT JOIN areas a ON a.id = e.area_id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'Expediente not found', 404);
    return success(res, result.rows[0]);
  } catch {
    return error(res, 'Failed to fetch expediente');
  }
};

exports.update = async (req, res) => {
  const { title, description, status, area_id } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (title) { updates.push(`title = $${idx++}`); params.push(title); }
  if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
  if (status) { updates.push(`status = $${idx++}`); params.push(status); }
  if (area_id !== undefined) { updates.push(`area_id = $${idx++}`); params.push(area_id || null); }

  if (!updates.length) return error(res, 'No fields to update', 400);
  updates.push('updated_at = NOW()');
  params.push(req.params.id);

  try {
    const result = await query(
      `UPDATE expedientes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (!result.rows[0]) return error(res, 'Not found', 404);

    if (status) {
      await query(
        `INSERT INTO expediente_timeline (expediente_id, user_id, action, description)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, req.user.id, 'Status Changed', `Status changed to ${status} by ${req.user.full_name}`]
      );
    }

    await auditLog(req.user.id, 'update', 'expedientes', req.params.id, 'Updated expediente', {}, req);
    return success(res, result.rows[0], 'Expediente updated');
  } catch {
    return error(res, 'Failed to update expediente');
  }
};

exports.remove = async (req, res) => {
  try {
    await query('DELETE FROM expedientes WHERE id = $1', [req.params.id]);
    await auditLog(req.user.id, 'delete', 'expedientes', req.params.id, 'Deleted expediente', {}, req);
    return success(res, null, 'Expediente deleted');
  } catch {
    return error(res, 'Failed to delete expediente');
  }
};

exports.addAssignee = async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return error(res, 'user_id required', 400);
  try {
    await query(
      'INSERT INTO expediente_assignees (expediente_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, user_id]
    );
    await query(
      `INSERT INTO expediente_timeline (expediente_id, user_id, action, description)
       VALUES ($1, $2, 'Assigned', $3)`,
      [req.params.id, req.user.id, `User assigned by ${req.user.full_name}`]
    );
    return success(res, null, 'Assignee added');
  } catch {
    return error(res, 'Failed to add assignee');
  }
};

exports.removeAssignee = async (req, res) => {
  try {
    await query('DELETE FROM expediente_assignees WHERE expediente_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    return success(res, null, 'Assignee removed');
  } catch {
    return error(res, 'Failed to remove assignee');
  }
};

exports.listMessages = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const result = await query(
      `SELECT em.*, u.full_name, u.avatar_url
       FROM expediente_messages em
       JOIN users u ON u.id = em.user_id
       WHERE em.expediente_id = $1
       ORDER BY em.created_at ASC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );
    return success(res, result.rows);
  } catch {
    return error(res, 'Failed to get messages');
  }
};

exports.addMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 400, errors.array());

  const { content } = req.body;
  try {
    const result = await query(
      `INSERT INTO expediente_messages (expediente_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, req.user.id, content]
    );
    const msg = { ...result.rows[0], full_name: req.user.full_name };

    try {
      getIO().to(`expediente:${req.params.id}`).emit('expediente:message', msg);
    } catch {}

    return created(res, msg, 'Message sent');
  } catch {
    return error(res, 'Failed to send message');
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    await query('DELETE FROM expediente_messages WHERE id = $1 AND (user_id = $2 OR $3)', [
      req.params.msgId, req.user.id, ['owner', 'super_admin'].includes(req.user.role)
    ]);
    return success(res, null, 'Message deleted');
  } catch {
    return error(res, 'Failed to delete message');
  }
};

exports.getTimeline = async (req, res) => {
  try {
    const result = await query(
      `SELECT et.*, u.full_name, u.avatar_url
       FROM expediente_timeline et
       JOIN users u ON u.id = et.user_id
       WHERE et.expediente_id = $1
       ORDER BY et.created_at ASC`,
      [req.params.id]
    );
    return success(res, result.rows);
  } catch {
    return error(res, 'Failed to get timeline');
  }
};

exports.linkDocument = async (req, res) => {
  const { document_id } = req.body;
  if (!document_id) return error(res, 'document_id required', 400);
  try {
    await query(
      'INSERT INTO expediente_documents (expediente_id, document_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, document_id]
    );
    return success(res, null, 'Document linked');
  } catch {
    return error(res, 'Failed to link document');
  }
};

exports.unlinkDocument = async (req, res) => {
  try {
    await query('DELETE FROM expediente_documents WHERE expediente_id = $1 AND document_id = $2', [req.params.id, req.params.docId]);
    return success(res, null, 'Document unlinked');
  } catch {
    return error(res, 'Failed to unlink document');
  }
};
