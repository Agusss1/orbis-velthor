const prisma = require('../../config/database');

exports.list = async (req, res, next) => {
  try {
    const coordinators = await prisma.coordinator.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        areas: { include: { area: { select: { id: true, name: true, type: true } } } },
      },
    });
    res.json(coordinators);
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const c = await prisma.coordinator.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        areas: { include: { area: true } },
      },
    });
    if (!c) return res.status(404).json({ error: 'Coordinator not found' });
    res.json(c);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { userId, bio, permissions, areaIds } = req.body;
    const c = await prisma.coordinator.create({
      data: {
        userId, bio, permissions: permissions || {},
        areas: areaIds?.length ? { create: areaIds.map((aid) => ({ areaId: aid })) } : undefined,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(c);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { bio, permissions } = req.body;
    const c = await prisma.coordinator.update({
      where: { id: req.params.id },
      data: { bio, permissions },
    });
    res.json(c);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.coordinator.delete({ where: { id: req.params.id } });
    res.json({ message: 'Coordinator removed' });
  } catch (e) { next(e); }
};

exports.assignArea = async (req, res, next) => {
  try {
    const ca = await prisma.coordinatorArea.create({
      data: { coordinatorId: req.params.id, areaId: req.body.areaId },
    });
    res.status(201).json(ca);
  } catch (e) { next(e); }
};

exports.removeArea = async (req, res, next) => {
  try {
    await prisma.coordinatorArea.deleteMany({
      where: { coordinatorId: req.params.id, areaId: req.params.areaId },
    });
    res.json({ message: 'Area removed from coordinator' });
  } catch (e) { next(e); }
};
