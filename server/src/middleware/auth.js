const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const ROLE_HIERARCHY = {
  OWNER: 6,
  SUPER_ADMIN: 5,
  POLITICAL_COORDINATOR: 4,
  AREA_MANAGER: 3,
  LEGISLATOR: 2,
  BASIC_USER: 1,
};

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive account' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireMinRole = (minRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY[minRole]) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, requireRole, requireMinRole, ROLE_HIERARCHY };
