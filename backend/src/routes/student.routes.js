const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { updateStudentJuzu } = require('../controllers/student.controller');

const router = express.Router();

// Apply global JWT authentication and restrict to Teacher role
router.use(protect, authorize('Teacher'));

// Update student's current Juzu
router.patch('/:studentId/juzu', updateStudentJuzu);

module.exports = router;
