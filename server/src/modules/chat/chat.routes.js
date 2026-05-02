const router = require('express').Router();
const controller = require('./chat.controller');
const { authenticate, requireMinRole } = require('../../middleware/auth');

router.use(authenticate);

router.get('/channels', controller.listChannels);
router.post('/channels', requireMinRole('AREA_MANAGER'), controller.createChannel);
router.get('/channels/:id/messages', controller.getMessages);
router.post('/channels/:id/messages', controller.postMessage);

module.exports = router;
