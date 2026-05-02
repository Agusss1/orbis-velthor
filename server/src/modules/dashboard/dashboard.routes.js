const router = require('express').Router();
const controller = require('./dashboard.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', controller.getOverview);
router.get('/alerts', controller.getAlerts);

module.exports = router;
