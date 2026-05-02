const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../utils/validate');

router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate,
  controller.login
);

router.post('/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty(),
  ],
  validate,
  controller.register
);

router.get('/me', authenticate, controller.me);
router.post('/logout', authenticate, controller.logout);
router.put('/change-password', authenticate,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })],
  validate,
  controller.changePassword
);

module.exports = router;
