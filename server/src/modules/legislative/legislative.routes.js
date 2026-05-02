const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./legislative.controller');
const { authenticate, requireMinRole } = require('../../middleware/auth');
const { logActivity } = require('../../middleware/activityLog');
const validate = require('../../utils/validate');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireMinRole('LEGISLATOR'),
  [body('title').notEmpty()], validate, logActivity('CREATE', 'expediente'), controller.create);
router.put('/:id', requireMinRole('LEGISLATOR'), logActivity('UPDATE', 'expediente'), controller.update);
router.delete('/:id', requireMinRole('AREA_MANAGER'), logActivity('DELETE', 'expediente'), controller.remove);
router.post('/:id/users', requireMinRole('AREA_MANAGER'), controller.addUser);
router.get('/:id/messages', controller.getMessages);
router.post('/:id/messages', controller.postMessage);

module.exports = router;
