const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', controller.list);
router.post('/',
  requireRole('owner', 'super_admin', 'political_coordinator', 'legislator'),
  [body('title').notEmpty().trim()],
  controller.create
);
router.get('/:id', controller.getOne);
router.patch('/:id', controller.update);
router.delete('/:id', requireRole('owner', 'super_admin'), controller.remove);

router.post('/:id/assignees', controller.addAssignee);
router.delete('/:id/assignees/:userId', controller.removeAssignee);

router.get('/:id/messages', controller.listMessages);
router.post('/:id/messages', [body('content').notEmpty()], controller.addMessage);
router.delete('/:id/messages/:msgId', controller.deleteMessage);

router.get('/:id/timeline', controller.getTimeline);

router.post('/:id/documents', controller.linkDocument);
router.delete('/:id/documents/:docId', controller.unlinkDocument);

module.exports = router;
