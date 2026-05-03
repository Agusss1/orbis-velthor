const router = require('express').Router();
const controller = require('./controller');
const { authenticate, requireOwnerOrSuperAdmin } = require('../../middleware/auth');

router.use(authenticate, requireOwnerOrSuperAdmin);

router.get('/overview', controller.overview);
router.get('/audit-logs', controller.auditLogs);
router.get('/user-activity', controller.userActivity);
router.get('/territorial-insights', controller.territorialInsights);
router.get('/engagement', controller.engagement);
router.get('/export/:type', controller.exportData);

module.exports = router;
