const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate);

router.get('/channels', controller.listChannels);
router.post('/channels',
  requireRole('owner', 'super_admin', 'political_coordinator', 'area_manager'),
  [body('name').notEmpty().trim()],
  controller.createChannel
);
router.get('/channels/:id', controller.getChannel);
router.post('/channels/:id/join', controller.joinChannel);
router.post('/channels/:id/leave', controller.leaveChannel);
router.post('/channels/:id/members', controller.addMember);

router.get('/channels/:id/messages', controller.listMessages);
router.post('/channels/:id/messages', [body('content').notEmpty()], controller.sendMessage);
router.patch('/channels/:id/messages/:msgId', controller.editMessage);
router.delete('/channels/:id/messages/:msgId', controller.deleteMessage);

module.exports = router;
