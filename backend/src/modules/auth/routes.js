const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

router.post('/login', loginRules, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
