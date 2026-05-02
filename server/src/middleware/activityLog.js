const prisma = require('../config/database');
const logger = require('../config/logger');

const logActivity = (action, resource) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      prisma.activityLog.create({
        data: {
          userId: req.user?.id,
          action,
          resource,
          resourceId: req.params?.id || body?.id || null,
          metadata: { method: req.method, path: req.path },
          ipAddress: req.ip,
        },
      }).catch((e) => logger.error('Activity log failed', e));
    }
    return originalJson(body);
  };
  next();
};

module.exports = { logActivity };
