const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// Public survey submission (no auth required)
router.post('/respond/:token', controller.submitResponse);
router.get('/public/:token', controller.getPublic);

router.use(authenticate);

router.get('/', controller.list);
router.post('/',
  requireRole('owner', 'super_admin', 'political_coordinator', 'area_manager'),
  [body('title').notEmpty().trim()],
  controller.create
);
router.get('/:id', controller.getOne);
router.patch('/:id', controller.update);
router.delete('/:id', requireRole('owner', 'super_admin'), controller.remove);
router.get('/:id/responses', controller.listResponses);
router.get('/:id/analytics', controller.analytics);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
