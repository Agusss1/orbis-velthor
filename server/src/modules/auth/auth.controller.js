const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    const { password: _, ...userOut } = user;
    res.json({ token, user: userOut });
  } catch (e) { next(e); }
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hash, name, role: role || 'BASIC_USER' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    const token = signToken(user.id);
    res.status(201).json({ token, user });
  } catch (e) { next(e); }
};

exports.me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true },
    include: {
      areaAssignments: { include: { area: { select: { id: true, name: true, type: true } } } },
    },
  });
  res.json(user);
};

exports.logout = (req, res) => res.json({ message: 'Logged out' });

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
    res.json({ message: 'Password updated' });
  } catch (e) { next(e); }
};
