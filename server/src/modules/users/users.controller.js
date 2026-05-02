const prisma = require('../../config/database');

const SELECT = { id: true, email: true, name: true, role: true, avatar: true, isActive: true, createdAt: true };

exports.list = async (req, res, next) => {
  try {
    const { search, role, areaId } = req.query;
    const where = {
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }),
      ...(role && { role }),
      ...(areaId && { areaAssignments: { some: { areaId } } }),
    };
    const users = await prisma.user.findMany({ where, select: SELECT, orderBy: { name: 'asc' } });
    res.json(users);
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { ...SELECT, areaAssignments: { include: { area: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, avatar },
      select: SELECT,
    });
    res.json(user);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'User deactivated' });
  } catch (e) { next(e); }
};

exports.changeRole = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: req.body.role },
      select: SELECT,
    });
    res.json(user);
  } catch (e) { next(e); }
};
