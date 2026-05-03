const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

router.get('/stats', controller.stats);
router.get('/activity', controller.recentActivity);
router.get('/alerts', controller.alerts);

module.exports = router;
