const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');
const { success, error } = require('../../utils/response');
const { auditLog } = require('../../middleware/logger');

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function signRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, 'Validation failed', 400, errors.array());

  const { email, password } = req.body;
  try {
    const result = await query(
      'SELECT id, email, password_hash, full_name, role, avatar_url, is_active FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) return error(res, 'Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return error(res, 'Invalid credentials', 401);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [uuidv4(), user.id, refreshToken, expiresAt]
    );

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    await auditLog(user.id, 'login', 'users', user.id, 'User logged in', {}, req);

    const { password_hash, ...userClean } = user;
    return success(res, { user: userClean, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    console.error(err);
    return error(res, 'Login failed');
  }
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return error(res, 'Refresh token required', 400);

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const stored = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.id]
    );
    if (!stored.rows[0]) return error(res, 'Invalid refresh token', 401);

    const userResult = await query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = userResult.rows[0];
    if (!user || !user.is_active) return error(res, 'User not found', 401);

    const newAccessToken = signAccessToken(user);
    return success(res, { accessToken: newAccessToken });
  } catch {
    return error(res, 'Invalid refresh token', 401);
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }
  await auditLog(req.user.id, 'logout', 'users', req.user.id, 'User logged out', {}, req);
  return success(res, null, 'Logged out');
};

exports.me = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.avatar_url, u.phone, u.last_login_at, u.created_at,
              COALESCE(json_agg(DISTINCT am.area_id) FILTER (WHERE am.area_id IS NOT NULL), '[]') as area_ids
       FROM users u
       LEFT JOIN area_members am ON am.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user.id]
    );
    return success(res, result.rows[0]);
  } catch (err) {
    return error(res, 'Failed to fetch user');
  }
};
