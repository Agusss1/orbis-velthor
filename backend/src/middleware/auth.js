const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const ROLE_HIERARCHY = {
  owner: 6,
  super_admin: 5,
  political_coordinator: 4,
  area_manager: 3,
  legislator: 2,
  basic_user: 1,
};

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!result.rows[0] || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = Math.min(...roles.map((r) => ROLE_HIERARCHY[r] || 99));

    if (userLevel >= requiredLevel) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

function requireOwnerOrSuperAdmin(req, res, next) {
  return requireRole('owner', 'super_admin')(req, res, next);
}

module.exports = { authenticate, requireRole, requireOwnerOrSuperAdmin, ROLE_HIERARCHY };
