const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', requireRole('owner', 'super_admin', 'political_coordinator'), controller.list);
router.post('/',
  requireRole('owner', 'super_admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('full_name').notEmpty().trim(),
    body('role').isIn(['super_admin', 'political_coordinator', 'area_manager', 'legislator', 'basic_user']),
  ],
  controller.create
);
router.get('/:id', controller.getOne);
router.patch('/:id',
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('full_name').optional().notEmpty().trim(),
    body('role').optional().isIn(['super_admin', 'political_coordinator', 'area_manager', 'legislator', 'basic_user']),
  ],
  controller.update
);
router.delete('/:id', requireRole('owner', 'super_admin'), controller.deactivate);
router.patch('/:id/activate', requireRole('owner', 'super_admin'), controller.activate);

module.exports = router;
