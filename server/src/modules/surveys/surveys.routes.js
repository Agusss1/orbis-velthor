const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./surveys.controller');
const { authenticate, requireMinRole } = require('../../middleware/auth');
const validate = require('../../utils/validate');

router.get('/respond/:token', controller.getPublic);
router.post('/respond/:token', controller.submitPublic);

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireMinRole('AREA_MANAGER'),
  [body('title').notEmpty(), body('questions').isArray()], validate, controller.create);
router.put('/:id', requireMinRole('AREA_MANAGER'), controller.update);
router.delete('/:id', requireMinRole('AREA_MANAGER'), controller.remove);
router.get('/:id/responses', requireMinRole('AREA_MANAGER'), controller.getResponses);
router.get('/:id/analytics', controller.getAnalytics);

module.exports = router;
