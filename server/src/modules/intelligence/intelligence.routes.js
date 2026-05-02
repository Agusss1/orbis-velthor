const router = require('express').Router();
const controller = require('./intelligence.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate, requireRole('OWNER', 'SUPER_ADMIN'));

router.get('/overview', controller.overview);
router.get('/audit-logs', controller.auditLogs);
router.get('/user-activity', controller.userActivity);
router.get('/territorial-insights', controller.territorialInsights);
router.get('/export', controller.exportData);

module.exports = router;
