const prisma = require('../../config/database');

exports.overview = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalAreas,
      totalExpedientes,
      expedienteActivity,
      totalSurveys,
      recentResponses,
      topAreas,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { activityLogs: { some: { createdAt: { gte: sevenDaysAgo } } } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.area.count({ where: { isActive: true } }),
      prisma.expediente.count(),
      prisma.expediente.groupBy({ by: ['status'], _count: true }),
      prisma.survey.count(),
      prisma.surveyResponse.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.area.findMany({
        where: { isActive: true },
        select: {
          id: true, name: true,
          _count: { select: { users: true, expedientes: true, documents: true, surveys: true } },
        },
        take: 10,
      }),
    ]);

    res.json({
      users: { total: totalUsers, active: activeUsers, newThisMonth: newUsers },
      areas: { total: totalAreas, topAreas: topAreas.sort((a, b) => b._count.expedientes - a._count.expedientes) },
      expedientes: { total: totalExpedientes, byStatus: expedienteActivity },
      surveys: { total: totalSurveys, recentResponses },
    });
  } catch (e) { next(e); }
};

exports.auditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId, action, resource } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          ...(userId && { userId }),
          ...(action && { action: { contains: action, mode: 'insensitive' } }),
          ...(resource && { resource }),
        },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(limit),
      }),
      prisma.activityLog.count({ where: { ...(userId && { userId }), ...(action && { action }), ...(resource && { resource }) } }),
    ]);

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { next(e); }
};

exports.userActivity = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        _count: { select: { activityLogs: true, documents: true, messages: true } },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
      orderBy: { name: 'asc' },
    });

    const result = users.map((u) => ({
      ...u,
      lastActivity: u.activityLogs[0]?.createdAt || null,
      activityLogs: undefined,
    }));

    res.json(result);
  } catch (e) { next(e); }
};

exports.territorialInsights = async (req, res, next) => {
  try {
    const territories = await prisma.territory.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { mapPins: true } },
        mapPins: {
          where: { isActive: true },
          include: { _count: { select: { surveys: true } } },
        },
      },
    });

    const insights = territories.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      pinCount: t._count.mapPins,
      surveyLinks: t.mapPins.reduce((acc, p) => acc + p._count.surveys, 0),
      engagementScore: t._count.mapPins * 10 + t.mapPins.reduce((acc, p) => acc + p._count.surveys, 0) * 5,
    }));

    insights.sort((a, b) => b.engagementScore - a.engagementScore);
    res.json(insights);
  } catch (e) { next(e); }
};

exports.exportData = async (req, res, next) => {
  try {
    const { type } = req.query;
    let data;

    if (type === 'users') {
      data = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      });
    } else if (type === 'activity') {
      data = await prisma.activityLog.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    } else if (type === 'surveys') {
      data = await prisma.surveyResponse.findMany({
        include: { survey: { select: { title: true } }, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return res.status(400).json({ error: 'Invalid export type' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export.json"`);
    res.json(data);
  } catch (e) { next(e); }
};
