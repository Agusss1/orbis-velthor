const prisma = require('../../config/database');

exports.list = async (req, res, next) => {
  try {
    const areas = await prisma.area.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { users: true, expedientes: true, documents: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(areas);
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const area = await prisma.area.findUnique({
      where: { id: req.params.id },
      include: {
        users: { include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } } },
        expedientes: { orderBy: { createdAt: 'desc' }, take: 10 },
        channels: true,
        _count: { select: { users: true, expedientes: true, documents: true, surveys: true } },
      },
    });
    if (!area) return res.status(404).json({ error: 'Area not found' });
    res.json(area);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, type, color } = req.body;
    const area = await prisma.area.create({ data: { name, description, type, color } });
    await prisma.channel.create({ data: { name: `#${name.toLowerCase().replace(/\s/g, '-')}`, type: 'area', areaId: area.id } });
    res.status(201).json(area);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, description, type, color, isActive } = req.body;
    const area = await prisma.area.update({ where: { id: req.params.id }, data: { name, description, type, color, isActive } });
    res.json(area);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.area.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Area deactivated' });
  } catch (e) { next(e); }
};

exports.addUser = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const au = await prisma.areaUser.create({ data: { userId, areaId: req.params.id, role: role || 'member' } });
    res.status(201).json(au);
  } catch (e) { next(e); }
};

exports.removeUser = async (req, res, next) => {
  try {
    await prisma.areaUser.deleteMany({ where: { areaId: req.params.id, userId: req.params.userId } });
    res.json({ message: 'User removed from area' });
  } catch (e) { next(e); }
};
