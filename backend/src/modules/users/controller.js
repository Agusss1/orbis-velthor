const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const { success, created, error, paginated } = require('../../utils/response');
const { auditLog } = require('../../middleware/logger');
const { ROLE_HIERARCHY } = require('../../middleware/auth');

exports.list = async (req, res) => {
  const { page = 1, limit = 20, role, search, is_active } = req.query;
  const offset = (page - 1) * limit;

  let conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (role) { conditions.push(`u.role = $${idx++}`); params.push(role); }
  if (search) { conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  if (is_active !== undefined) { conditions.push(`u.is_active = $${idx++}`); params.push(is_active === 'true'); }

  const where = conditions.join(' AND ');

  try {
    const countResult = await query(`SELECT COUNT(*) FROM users u WHERE ${where}`, params);
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.avatar_url, u.phone, u.is_active, u.last_login_at, u.created_at
       FROM users u WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    return paginated(res, result.rows, parseInt(countResult.rows[0].count), page, limit);
  } catch (err) {
    return error(res, 'Failed to list users');
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 400, errors.array());

  const { email, password, full_name, role, phone } = req.body;

  const callerLevel = ROLE_HIERARCHY[req.user.role] || 0;
  const targetLevel = ROLE_HIERARCHY[role] || 0;
  if (targetLevel >= callerLevel && req.user.role !== 'owner') {
    return error(res, 'Cannot create user with equal or higher role', 403);
  }

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) return error(res, 'Email already in use', 409);

    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, phone, is_active, created_at`,
      [email, hash, full_name, role, phone || null]
    );

    await auditLog(req.user.id, 'create', 'users', result.rows[0].id, `Created user ${email}`, {}, req);
    return created(res, result.rows[0], 'User created');
  } catch (err) {
    return error(res, 'Failed to create user');
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.avatar_url, u.phone, u.is_active, u.last_login_at, u.created_at,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', a.id, 'name', a.name)) FILTER (WHERE a.id IS NOT NULL), '[]') as areas
       FROM users u
       LEFT JOIN area_members am ON am.user_id = u.id
       LEFT JOIN areas a ON a.id = am.area_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'User not found', 404);
    return success(res, result.rows[0]);
  } catch {
    return error(res, 'Failed to fetch user');
  }
};

exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 400, errors.array());

  const isSelf = req.params.id === req.user.id;
  const isAdmin = ['owner', 'super_admin'].includes(req.user.role);
  if (!isSelf && !isAdmin) return error(res, 'Forbidden', 403);

  const { full_name, phone, avatar_url, role } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (full_name) { updates.push(`full_name = $${idx++}`); params.push(full_name); }
  if (phone !== undefined) { updates.push(`phone = $${idx++}`); params.push(phone); }
  if (avatar_url !== undefined) { updates.push(`avatar_url = $${idx++}`); params.push(avatar_url); }
  if (role && isAdmin && req.user.role === 'owner') { updates.push(`role = $${idx++}`); params.push(role); }

  if (!updates.length) return error(res, 'No fields to update', 400);

  updates.push(`updated_at = NOW()`);
  params.push(req.params.id);

  try {
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, full_name, role, phone, avatar_url, is_active`,
      params
    );
    if (!result.rows[0]) return error(res, 'User not found', 404);
    await auditLog(req.user.id, 'update', 'users', req.params.id, 'Updated user', {}, req);
    return success(res, result.rows[0], 'User updated');
  } catch {
    return error(res, 'Failed to update user');
  }
};

exports.deactivate = async (req, res) => {
  if (req.params.id === req.user.id) return error(res, 'Cannot deactivate yourself', 400);
  try {
    const result = await query(
      'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'User not found', 404);
    await auditLog(req.user.id, 'update', 'users', req.params.id, 'Deactivated user', {}, req);
    return success(res, null, 'User deactivated');
  } catch {
    return error(res, 'Failed to deactivate user');
  }
};

exports.activate = async (req, res) => {
  try {
    const result = await query(
      'UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0]) return error(res, 'User not found', 404);
    await auditLog(req.user.id, 'update', 'users', req.params.id, 'Activated user', {}, req);
    return success(res, null, 'User activated');
  } catch {
    return error(res, 'Failed to activate user');
  }
};
