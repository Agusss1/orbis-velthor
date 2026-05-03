const { validationResult } = require('express-validator');
const { query } = require('../../config/database');
const { success, created, error, paginated } = require('../../utils/response');
const { auditLog } = require('../../middleware/logger');

exports.list = async (req, res) => {
  const { page = 1, limit = 50, type, search } = req.query;
  const offset = (page - 1) * limit;
  const isAdmin = ['owner', 'super_admin'].includes(req.user.role);

  let conditions = ['a.is_active = TRUE'];
  const params = [];
  let idx = 1;

  if (!isAdmin) {
    conditions.push(`(a.id IN (SELECT area_id FROM area_members WHERE user_id = $${idx++}) OR a.created_by = $${idx++})`);
    params.push(req.user.id, req.user.id);
  }
  if (type) { conditions.push(`a.type = $${idx++}`); params.push(type); }
  if (search) { conditions.push(`a.name ILIKE $${idx++}`); params.push(`%${search}%`); }

  const where = conditions.join(' AND ');

  try {
    const countRes = await query(`SELECT COUNT(*) FROM areas a WHERE ${where}`, params);
    const result = await query(
      `SELECT a.*, u.full_name as created_by_name,
              (SELECT COUNT(*) FROM area_members WHERE area_id = a.id) as member_count
       FROM areas a
       JOIN users u ON u.id = a.created_by
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    return paginated(res, result.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) {
    return error(res, 'Failed to list areas');
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 400, errors.array());

  const { name, description, type, color, icon, parent_id } = req.body;
  try {
    const result = await query(
      `INSERT INTO areas (name, description, type, color, icon, parent_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description || null, type || null, color || '#3B82F6', icon || 'folder', parent_id || null, req.user.id]
    );

    // Auto-add creator as coordinator
    await query(
      `INSERT INTO area_members (area_id, user_id, role, permissions)
       VALUES ($1, $2, 'coordinator', '{"create":true,"read":true,"update":true,"delete":true}')`,
      [result.rows[0].id, req.user.id]
    );

    await auditLog(req.user.id, 'create', 'areas', result.rows[0].id, `Created area: ${name}`, {}, req);
    return created(res, result.rows[0], 'Area created');
  } catch {
    return error(res, 'Failed to create area');
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.full_name as created_by_name,
              (SELECT json_agg(jsonb_build_object('id', u2.id, 'full_name', u2.full_name, 'role', am.role, 'email', u2.email))
               FROM area_members am JOIN users u2 ON u2.id = am.user_id
               WHERE am.area_id = a.id) as members
       FROM areas a
       JOIN users u ON u.id = a.created_by
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'Area not found', 404);
    return success(res, result.rows[0]);
  } catch {
    return error(res, 'Failed to fetch area');
  }
};

exports.update = async (req, res) => {
  const { name, description, type, color, icon } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (name) { updates.push(`name = $${idx++}`); params.push(name); }
  if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
  if (type) { updates.push(`type = $${idx++}`); params.push(type); }
  if (color) { updates.push(`color = $${idx++}`); params.push(color); }
  if (icon) { updates.push(`icon = $${idx++}`); params.push(icon); }

  if (!updates.length) return error(res, 'No fields to update', 400);
  updates.push('updated_at = NOW()');
  params.push(req.params.id);

  try {
    const result = await query(
      `UPDATE areas SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (!result.rows[0]) return error(res, 'Area not found', 404);
    await auditLog(req.user.id, 'update', 'areas', req.params.id, `Updated area`, {}, req);
    return success(res, result.rows[0], 'Area updated');
  } catch {
    return error(res, 'Failed to update area');
  }
};

exports.remove = async (req, res) => {
  try {
    await query('UPDATE areas SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [req.params.id]);
    await auditLog(req.user.id, 'delete', 'areas', req.params.id, 'Archived area', {}, req);
    return success(res, null, 'Area archived');
  } catch {
    return error(res, 'Failed to archive area');
  }
};

exports.listMembers = async (req, res) => {
  try {
    const result = await query(
      `SELECT am.*, u.full_name, u.email, u.role as user_role, u.avatar_url
       FROM area_members am
       JOIN users u ON u.id = am.user_id
       WHERE am.area_id = $1
       ORDER BY am.joined_at DESC`,
      [req.params.id]
    );
    return success(res, result.rows);
  } catch {
    return error(res, 'Failed to list members');
  }
};

exports.addMember = async (req, res) => {
  const { user_id, role = 'member', permissions } = req.body;
  if (!user_id) return error(res, 'user_id required', 400);

  const defaultPerms = permissions || { create: false, read: true, update: false, delete: false };
  try {
    await query(
      `INSERT INTO area_members (area_id, user_id, role, permissions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (area_id, user_id) DO UPDATE SET role = $3, permissions = $4`,
      [req.params.id, user_id, role, JSON.stringify(defaultPerms)]
    );
    await auditLog(req.user.id, 'assign', 'areas', req.params.id, `Added member ${user_id}`, {}, req);
    return success(res, null, 'Member added');
  } catch {
    return error(res, 'Failed to add member');
  }
};

exports.removeMember = async (req, res) => {
  try {
    await query('DELETE FROM area_members WHERE area_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    await auditLog(req.user.id, 'unassign', 'areas', req.params.id, `Removed member ${req.params.userId}`, {}, req);
    return success(res, null, 'Member removed');
  } catch {
    return error(res, 'Failed to remove member');
  }
};
