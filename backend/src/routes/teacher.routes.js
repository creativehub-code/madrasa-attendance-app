const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateRequest } = require('../middleware/validateRequest');
const { validateProgressEntriesOwnership } = require('../middleware/studentAccess');
const { submitProgressValidator } = require('../validators/teacher.validator');
const {
  submitProgressBodySchema,
  flagStudentBodySchema,
  feedbackReadParamsSchema,
  needsAttentionParamsSchema,
} = require('../validations/teacher.validation');
const {
  getAssignedStudents,
  getTeacherSubmissionStatus,
  submitProgress,
  getClassSummary,
  getNeedsAttention,
  deleteNeedsAttention,
  getTeacherAnnouncements,
  getFeedbacks,
  markFeedbackRead,
  flagStudentIssue,
  getProgressReports,
} = require('../controllers/teacher.controller');

const router = express.Router();

// All teacher routes require authentication
router.use(protect);

// ─── RBAC helpers ─────────────────────────────────────────────────────────────
// GET routes: Teachers can read their own data; Admin can read for oversight.
// Write routes (POST / PATCH / DELETE): strictly Teacher-only.
const teacherOrAdmin = authorize('Teacher', 'Admin');
const teacherOnly = authorize('Teacher');

// ─── Students & Submission Status ─────────────────────────────────────────────
router.get('/students', teacherOrAdmin, getAssignedStudents);
router.get('/submission-status', teacherOrAdmin, getTeacherSubmissionStatus);

// ─── Progress submission (write — Teacher only) ────────────────────────────────
// Order: RBAC → Zod body schema → express-validator rules → ownership check → controller
router.post(
  '/progress',
  teacherOnly,
  validateRequest({ body: submitProgressBodySchema }),
  submitProgressValidator,
  validate,
  validateProgressEntriesOwnership,
  submitProgress
);

// ─── Dashboard / Summary ───────────────────────────────────────────────────────
router.get('/class-summary', teacherOrAdmin, getClassSummary);
router.get('/needs-attention', teacherOrAdmin, getNeedsAttention);
router.delete(
  '/needs-attention/:id',
  teacherOnly,
  validateRequest({ params: needsAttentionParamsSchema }),
  deleteNeedsAttention
);
router.get('/announcements', teacherOrAdmin, getTeacherAnnouncements);

// ─── Parent Feedbacks / Inbox ──────────────────────────────────────────────────
router.get('/feedbacks', teacherOrAdmin, getFeedbacks);
router.patch(
  '/feedbacks/:id/read',
  teacherOnly,
  validateRequest({ params: feedbackReadParamsSchema }),
  markFeedbackRead
);

// ─── Flag student issue to Admin / Parent (write — Teacher only) ───────────────
router.post(
  '/flag',
  teacherOnly,
  validateRequest({ body: flagStudentBodySchema }),
  flagStudentIssue
);

// ─── Progress Reports ──────────────────────────────────────────────────────────
router.get('/reports/progress', teacherOrAdmin, getProgressReports);

module.exports = router;

