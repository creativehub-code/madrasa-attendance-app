const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginValidator } = require('../validators/auth.validator');
const { login, changePassword, getMe } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', loginValidator, validate, login);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);

module.exports = router;
