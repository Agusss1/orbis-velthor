const router = require('express').Router();
const controller = require('./coordinators.controller');
const { authenticate, requireMinRole } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireMinRole('SUPER_ADMIN'), controller.create);
router.put('/:id', requireMinRole('POLITICAL_COORDINATOR'), controller.update);
router.delete('/:id', requireMinRole('SUPER_ADMIN'), controller.remove);
router.post('/:id/areas', requireMinRole('SUPER_ADMIN'), controller.assignArea);
router.delete('/:id/areas/:areaId', requireMinRole('SUPER_ADMIN'), controller.removeArea);

module.exports = router;
