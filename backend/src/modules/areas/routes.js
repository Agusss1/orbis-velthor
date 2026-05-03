const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', controller.list);
router.post('/',
  requireRole('owner', 'super_admin', 'political_coordinator'),
  [body('name').notEmpty().trim(), body('type').optional().trim()],
  controller.create
);
router.get('/:id', controller.getOne);
router.patch('/:id', requireRole('owner', 'super_admin', 'political_coordinator'), controller.update);
router.delete('/:id', requireRole('owner', 'super_admin'), controller.remove);

router.get('/:id/members', controller.listMembers);
router.post('/:id/members', requireRole('owner', 'super_admin', 'political_coordinator', 'area_manager'), controller.addMember);
router.delete('/:id/members/:userId', requireRole('owner', 'super_admin', 'political_coordinator', 'area_manager'), controller.removeMember);

module.exports = router;
