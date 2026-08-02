const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createExam,
  getExams,
  submitExamMarks,
  getExamMarks,
  updateSyllabus,
  getSyllabus,
} = require('../controllers/academic.controller');

const router = express.Router();

// Require authentication for all academic routes
router.use(protect);

// Exams
router.get('/exams', getExams);
router.get('/exams/:examId/marks', getExamMarks);

// Admin-only exam creation
router.post('/exams', authorize('Admin'), createExam);

// Teachers & Admin exam mark entry
router.post('/exams/:examId/marks', authorize('Teacher', 'school_teacher', 'Admin'), submitExamMarks);

// Syllabus
router.get('/syllabus', getSyllabus);
// Admin-only syllabus configuration
router.post('/syllabus', authorize('Admin'), updateSyllabus);

module.exports = router;
