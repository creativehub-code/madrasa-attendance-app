const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getClasses, getClassById, createClass } = require('../controllers/class.controller');

const router = express.Router();

// Require authentication for all class routes
router.use(protect);

router.get('/', getClasses);
router.get('/:id', getClassById);
router.post('/', authorize('Admin', 'Teacher', 'school_teacher'), createClass);

module.exports = router;
