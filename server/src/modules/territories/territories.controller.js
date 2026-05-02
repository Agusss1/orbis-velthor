const prisma = require('../../config/database');

exports.list = async (req, res, next) => {
  try {
    const territories = await prisma.territory.findMany({
      where: { isActive: true },
      include: { _count: { select: { mapPins: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(territories);
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const t = await prisma.territory.findUnique({
      where: { id: req.params.id },
      include: { mapPins: { include: { users: { include: { user: { select: { id: true, name: true } } } }, surveys: { include: { survey: { select: { id: true, title: true } } } } } } },
    });
    if (!t) return res.status(404).json({ error: 'Territory not found' });
    res.json(t);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, code, description, polygon, metadata } = req.body;
    const t = await prisma.territory.create({ data: { name, code, description, polygon, metadata } });
    res.status(201).json(t);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const t = await prisma.territory.update({ where: { id: req.params.id }, data: req.body });
    res.json(t);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.territory.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Territory deactivated' });
  } catch (e) { next(e); }
};

exports.listPins = async (req, res, next) => {
  try {
    const { territoryId, category } = req.query;
    const pins = await prisma.mapPin.findMany({
      where: {
        isActive: true,
        ...(territoryId && { territoryId }),
        ...(category && { category }),
      },
      include: {
        territory: { select: { id: true, name: true } },
        users: { include: { user: { select: { id: true, name: true } } } },
        surveys: { include: { survey: { select: { id: true, title: true } } } },
      },
    });
    res.json(pins);
  } catch (e) { next(e); }
};

exports.createPin = async (req, res, next) => {
  try {
    const { title, description, lat, lng, category, color, territoryId, metadata, userIds, surveyIds } = req.body;
    const pin = await prisma.mapPin.create({
      data: {
        title, description, lat, lng, category, color, territoryId, metadata,
        users: userIds?.length ? { create: userIds.map((uid) => ({ userId: uid })) } : undefined,
        surveys: surveyIds?.length ? { create: surveyIds.map((sid) => ({ surveyId: sid })) } : undefined,
      },
      include: { users: true, surveys: true },
    });
    res.status(201).json(pin);
  } catch (e) { next(e); }
};

exports.updatePin = async (req, res, next) => {
  try {
    const pin = await prisma.mapPin.update({ where: { id: req.params.id }, data: req.body });
    res.json(pin);
  } catch (e) { next(e); }
};

exports.deletePin = async (req, res, next) => {
  try {
    await prisma.mapPin.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Pin deleted' });
  } catch (e) { next(e); }
};
