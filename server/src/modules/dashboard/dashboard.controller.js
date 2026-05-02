const prisma = require('../../config/database');

exports.getOverview = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeAreas,
      totalExpedientes,
      expedientesByStatus,
      recentExpedientes,
      totalDocuments,
      totalSurveys,
      surveyResponses,
      totalMapPins,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.area.count({ where: { isActive: true } }),
      prisma.expediente.count(),
      prisma.expediente.groupBy({ by: ['status'], _count: true }),
      prisma.expediente.findMany({
        take: 5, orderBy: { updatedAt: 'desc' },
        include: { area: { select: { id: true, name: true } } },
      }),
      prisma.document.count({ where: { isActive: true } }),
      prisma.survey.count(),
      prisma.surveyResponse.count(),
      prisma.mapPin.count({ where: { isActive: true } }),
      prisma.activityLog.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    const surveysWithResponses = await prisma.survey.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { responses: true } }, area: { select: { name: true } } },
    });

    res.json({
      stats: { totalUsers, activeAreas, totalExpedientes, totalDocuments, totalSurveys, surveyResponses, totalMapPins },
      expedientesByStatus: expedientesByStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
      recentExpedientes,
      surveysWithResponses,
      recentActivity,
    });
  } catch (e) { next(e); }
};

exports.getAlerts = async (req, res, next) => {
  try {
    const alerts = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const inactiveAreas = await prisma.area.findMany({
      where: {
        isActive: true,
        expedientes: { none: { updatedAt: { gte: thirtyDaysAgo } } },
      },
      select: { id: true, name: true },
      take: 5,
    });

    inactiveAreas.forEach((a) =>
      alerts.push({ type: 'warning', title: 'Area requires attention', message: `Area "${a.name}" has had no expediente activity in 30 days`, resourceId: a.id, resource: 'area' })
    );

    const pendingExpedientes = await prisma.expediente.count({ where: { status: 'IN_PROGRESS' } });
    if (pendingExpedientes > 10) {
      alerts.push({ type: 'info', title: 'High legislative workload', message: `${pendingExpedientes} expedientes currently in progress` });
    }

    const recentSurveyResponses = await prisma.surveyResponse.groupBy({
      by: ['surveyId'], _count: true,
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { _count: { surveyId: 'desc' } },
      take: 3,
    });

    for (const r of recentSurveyResponses) {
      if (r._count > 20) {
        const survey = await prisma.survey.findUnique({ where: { id: r.surveyId }, select: { title: true } });
        alerts.push({ type: 'success', title: 'High engagement detected', message: `Survey "${survey?.title}" received ${r._count} responses this week`, resourceId: r.surveyId, resource: 'survey' });
      }
    }

    res.json(alerts);
  } catch (e) { next(e); }
};
