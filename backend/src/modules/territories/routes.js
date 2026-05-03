const router = require('express').Router();
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', controller.listTerritories);
router.post('/', requireRole('owner', 'super_admin', 'political_coordinator'), controller.createTerritory);
router.get('/:id', controller.getTerritory);
router.patch('/:id', requireRole('owner', 'super_admin', 'political_coordinator'), controller.updateTerritory);
router.delete('/:id', requireRole('owner', 'super_admin'), controller.deleteTerritory);

router.get('/pins/all', controller.listPins);
router.post('/pins', requireRole('owner', 'super_admin', 'political_coordinator', 'area_manager'), controller.createPin);
router.get('/pins/:id', controller.getPin);
router.patch('/pins/:id', controller.updatePin);
router.delete('/pins/:id', requireRole('owner', 'super_admin', 'political_coordinator'), controller.deletePin);
router.post('/pins/:id/notes', controller.addPinNote);
router.post('/pins/:id/assignees', controller.addPinAssignee);
router.delete('/pins/:id/assignees/:userId', controller.removePinAssignee);

module.exports = router;
