const prisma = require('../../config/database');

exports.listChannels = async (req, res, next) => {
  try {
    const channels = await prisma.channel.findMany({
      where: { isActive: true },
      include: { area: { select: { id: true, name: true } }, _count: { select: { messages: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(channels);
  } catch (e) { next(e); }
};

exports.createChannel = async (req, res, next) => {
  try {
    const { name, type, areaId } = req.body;
    const channel = await prisma.channel.create({ data: { name, type, areaId } });
    res.status(201).json(channel);
  } catch (e) { next(e); }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { cursor, limit = 50 } = req.query;
    const messages = await prisma.message.findMany({
      where: { channelId: req.params.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    res.json(messages.reverse());
  } catch (e) { next(e); }
};

exports.postMessage = async (req, res, next) => {
  try {
    const message = await prisma.message.create({
      data: { content: req.body.content, senderId: req.user.id, channelId: req.params.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
    res.status(201).json(message);
  } catch (e) { next(e); }
};
