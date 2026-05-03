const router = require('express').Router();
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.use(authenticate);

router.get('/', controller.list);
router.post('/',
  requireRole('owner', 'super_admin', 'political_coordinator', 'area_manager', 'legislator'),
  (req, res, next) => { req.uploadSubDir = 'documents'; next(); },
  upload.single('file'),
  controller.create
);
router.get('/:id', controller.getOne);
router.put('/:id/version',
  (req, res, next) => { req.uploadSubDir = 'documents'; next(); },
  upload.single('file'),
  controller.addVersion
);
router.patch('/:id', controller.update);
router.delete('/:id', requireRole('owner', 'super_admin'), controller.remove);
router.get('/:id/download', controller.download);

module.exports = router;
