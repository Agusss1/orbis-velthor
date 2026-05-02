const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./users.controller');
const { authenticate, requireMinRole } = require('../../middleware/auth');
const validate = require('../../utils/validate');

router.use(authenticate);

router.get('/', requireMinRole('AREA_MANAGER'), controller.list);
router.get('/:id', controller.getOne);
router.put('/:id', controller.update);
router.delete('/:id', requireMinRole('SUPER_ADMIN'), controller.remove);
router.put('/:id/role', requireMinRole('SUPER_ADMIN'),
  [body('role').isIn(['OWNER','SUPER_ADMIN','POLITICAL_COORDINATOR','AREA_MANAGER','LEGISLATOR','BASIC_USER'])],
  validate,
  controller.changeRole
);

module.exports = router;
