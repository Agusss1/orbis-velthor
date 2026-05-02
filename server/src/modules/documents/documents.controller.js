const prisma = require('../../config/database');
const path = require('path');
const fs = require('fs');

exports.list = async (req, res, next) => {
  try {
    const { areaId, expedienteId, tag, search } = req.query;
    const docs = await prisma.document.findMany({
      where: {
        isActive: true,
        ...(areaId && { areaId }),
        ...(expedienteId && { expedienteId }),
        ...(tag && { tags: { has: tag } }),
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
      },
      include: { uploadedBy: { select: { id: true, name: true } }, area: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { uploadedBy: { select: { id: true, name: true } }, versions: { orderBy: { version: 'desc' } } },
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { title, description, areaId, expedienteId, tags } = req.body;
    const doc = await prisma.document.create({
      data: {
        title: title || req.file.originalname,
        description,
        filename: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedById: req.user.id,
        areaId: areaId || null,
        expedienteId: expedienteId || null,
        tags: tags ? JSON.parse(tags) : [],
      },
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { title, description, tags, areaId, expedienteId } = req.body;
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { title, description, tags, areaId, expedienteId },
    });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.document.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Document deleted' });
  } catch (e) { next(e); }
};

exports.download = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.download(path.resolve(doc.path), doc.filename);
  } catch (e) { next(e); }
};

exports.uploadVersion = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    await prisma.documentVersion.create({
      data: { documentId: doc.id, version: doc.version, filename: doc.filename, path: doc.path },
    });
    const updated = await prisma.document.update({
      where: { id: req.params.id },
      data: { filename: req.file.originalname, path: req.file.path, version: doc.version + 1 },
    });
    res.json(updated);
  } catch (e) { next(e); }
};
