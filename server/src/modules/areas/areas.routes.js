const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./areas.controller');
const { authenticate, requireMinRole } = require('../../middleware/auth');
const { logActivity } = require('../../middleware/activityLog');
const validate = require('../../utils/validate');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireMinRole('POLITICAL_COORDINATOR'),
  [body('name').notEmpty()], validate, logActivity('CREATE', 'area'), controller.create);
router.put('/:id', requireMinRole('AREA_MANAGER'), logActivity('UPDATE', 'area'), controller.update);
router.delete('/:id', requireMinRole('SUPER_ADMIN'), logActivity('DELETE', 'area'), controller.remove);
router.post('/:id/users', requireMinRole('AREA_MANAGER'), controller.addUser);
router.delete('/:id/users/:userId', requireMinRole('AREA_MANAGER'), controller.removeUser);

module.exports = router;
