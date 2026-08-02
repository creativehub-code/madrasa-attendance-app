const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getClasses, createClass } = require('../controllers/class.controller');

const router = express.Router();

// Require authentication for all class routes
router.use(protect);

router.get('/', getClasses);
router.post('/', authorize('Admin', 'Teacher', 'school_teacher'), createClass);

module.exports = router;
