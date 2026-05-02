const router = require('express').Router();
const controller = require('./territories.controller');
const { authenticate, requireMinRole } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireMinRole('AREA_MANAGER'), controller.create);
router.put('/:id', requireMinRole('AREA_MANAGER'), controller.update);
router.delete('/:id', requireMinRole('SUPER_ADMIN'), controller.remove);

router.get('/pins', controller.listPins);
router.post('/pins', requireMinRole('AREA_MANAGER'), controller.createPin);
router.put('/pins/:id', requireMinRole('AREA_MANAGER'), controller.updatePin);
router.delete('/pins/:id', requireMinRole('AREA_MANAGER'), controller.deletePin);

module.exports = router;
