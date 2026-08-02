const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateRequest } = require('../middleware/validateRequest');
const {
  createAdminStudentBodySchema,
  createAdminTeacherBodySchema,
  createAnnouncementBodySchema,
  updateStudentParamsSchema,
  updateStudentBodySchema,
  reportActionParamsSchema,
  reportActionBodySchema,
  reportDeleteParamsSchema,
} = require('../validations/admin.validation');
const {
  createUserValidator,
  bulkStudentsValidator,
  createStudentValidator,
  createTeacherValidator,
  createAnnouncementValidator,
  reportActionValidator,
  reportParamIdValidator,
} = require('../validators/admin.validator');
const {
  createUser,
  bulkCreateStudents,
  createAnnouncement,
  createStudent,
  createTeacher,
  getStats,
  getStudents,
  getTeachers,
  getRecentActivities,
  unlockTeacherProgress,
  getIssueReports,
  markReportAsRead,
  updateReportAction,
  deleteReport,
  updateStudent,
  deleteStudent,
  getStudentProgressSummary,
  getSections,
  getParents,
} = require('../controllers/admin.controller');

const router = express.Router();

// Strict RBAC: All Admin routes require valid JWT and Admin role
router.use(protect, authorize('Admin'));

// ── Read Endpoints ─────────────────────────────────────────────────────────────
router.get('/stats', getStats);
router.get('/students', getStudents);
router.get('/sections', getSections);
router.get('/parents', getParents);
router.get('/students/:id/progress', getStudentProgressSummary);
router.get('/teachers', getTeachers);
router.get('/recent-activities', getRecentActivities);
router.get('/reports', getIssueReports);

// ── Mutation Endpoints ─────────────────────────────────────────────────────────
router.patch(
  '/students/:id',
  validateRequest({ params: updateStudentParamsSchema, body: updateStudentBodySchema }),
  updateStudent
);

router.delete('/students/:id', deleteStudent);

router.patch(
  '/reports/:id/read',
  validateRequest({ params: reportDeleteParamsSchema }),
  markReportAsRead
);

router.patch(
  '/reports/:id/action',
  validateRequest({ params: reportActionParamsSchema, body: reportActionBodySchema }),
  reportActionValidator,
  validate,
  updateReportAction
);

router.delete(
  '/reports/:id',
  validateRequest({ params: reportDeleteParamsSchema }),
  reportParamIdValidator,
  validate,
  deleteReport
);

// Reset / Unlock Teacher Progress
router.patch('/teacher-progress/:teacherId/unlock', unlockTeacherProgress);

// Write — single-step UI form endpoints
router.post(
  '/students/create',
  validateRequest({ body: createAdminStudentBodySchema }),
  createStudentValidator,
  validate,
  createStudent
);

router.post(
  '/teachers/create',
  validateRequest({ body: createAdminTeacherBodySchema }),
  createTeacherValidator,
  validate,
  createTeacher
);

// Write — advanced bulk / raw endpoints
router.post('/users', createUserValidator, validate, createUser);
router.post('/students/bulk', bulkStudentsValidator, validate, bulkCreateStudents);
router.post(
  '/announcements',
  validateRequest({ body: createAnnouncementBodySchema }),
  createAnnouncementValidator,
  validate,
  createAnnouncement
);

module.exports = router;

