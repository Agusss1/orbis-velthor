const prisma = require('../../config/database');

exports.list = async (req, res, next) => {
  try {
    const { status, areaId, search } = req.query;
    const items = await prisma.expediente.findMany({
      where: {
        ...(status && { status }),
        ...(areaId && { areaId }),
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        area: { select: { id: true, name: true } },
        users: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { documents: true, messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(items);
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const item = await prisma.expediente.findUnique({
      where: { id: req.params.id },
      include: {
        area: true,
        users: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        documents: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
        timeline: { orderBy: { createdAt: 'asc' } },
        _count: { select: { messages: true } },
      },
    });
    if (!item) return res.status(404).json({ error: 'Expediente not found' });
    res.json(item);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, description, areaId, userIds } = req.body;
    const item = await prisma.expediente.create({
      data: {
        title, description, areaId,
        users: userIds?.length ? { create: userIds.map((uid) => ({ userId: uid })) } : undefined,
      },
    });
    await prisma.expedienteEvent.create({ data: { expedienteId: item.id, description: 'Expediente created' } });
    res.status(201).json(item);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { title, description, status, areaId } = req.body;
    const item = await prisma.expediente.update({
      where: { id: req.params.id },
      data: { title, description, status, areaId },
    });
    await prisma.expedienteEvent.create({
      data: { expedienteId: item.id, description: `Status updated to ${status || 'updated'}`, metadata: req.body },
    });
    res.json(item);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.expediente.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expediente deleted' });
  } catch (e) { next(e); }
};

exports.addUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    await prisma.expedienteUser.create({ data: { expedienteId: req.params.id, userId } });
    await prisma.expedienteEvent.create({ data: { expedienteId: req.params.id, description: `User assigned` } });
    res.status(201).json({ message: 'User added' });
  } catch (e) { next(e); }
};

exports.getMessages = async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      where: { expedienteId: req.params.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (e) { next(e); }
};

exports.postMessage = async (req, res, next) => {
  try {
    const message = await prisma.message.create({
      data: { content: req.body.content, senderId: req.user.id, expedienteId: req.params.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
    res.status(201).json(message);
  } catch (e) { next(e); }
};
