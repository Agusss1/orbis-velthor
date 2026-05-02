const router = require('express').Router();
const controller = require('./documents.controller');
const { authenticate } = require('../../middleware/auth');
const { logActivity } = require('../../middleware/activityLog');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './src/uploads'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 },
});

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', upload.single('file'), logActivity('UPLOAD', 'document'), controller.upload);
router.put('/:id', controller.update);
router.delete('/:id', logActivity('DELETE', 'document'), controller.remove);
router.get('/:id/download', controller.download);
router.post('/:id/version', upload.single('file'), controller.uploadVersion);

module.exports = router;
