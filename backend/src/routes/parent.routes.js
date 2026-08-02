const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateRequest } = require('../middleware/validateRequest');
const { assertParentOwnsStudent } = require('../middleware/studentAccess');
const { assertParentOwnsReport } = require('../middleware/parentAccess');
const { sendFeedbackValidator } = require('../validators/parent.validator');
const {
  sendFeedbackBodySchema,
  reportReadParamsSchema,
  dailyProgressQuerySchema,
  monthlyProgressQuerySchema,
} = require('../validations/parent.validation');
const {
  getParentChildren,
  getDailyProgress,
  getMonthlyProgress,
  getAnnouncements,
  sendFeedback,
  getParentReports,
  markReportAsRead,
} = require('../controllers/parent.controller');

const router = express.Router();

router.use(protect, authorize('Parent'));

router.get('/children', getParentChildren);

// Query param validation guards against malformed studentId / date before DB queries
router.get('/progress/daily', validateRequest({ query: dailyProgressQuerySchema }), assertParentOwnsStudent, getDailyProgress);
router.get('/progress/monthly', validateRequest({ query: monthlyProgressQuerySchema }), assertParentOwnsStudent, getMonthlyProgress);

router.get('/announcements', getAnnouncements);

// Order: ownership check → existing express-validator chain → Zod body schema → controller
router.post(
  '/feedback',
  assertParentOwnsStudent,
  sendFeedbackValidator,
  validate,
  validateRequest({ body: sendFeedbackBodySchema }),
  sendFeedback
);

router.get('/reports', getParentReports);

// Order: Zod param validation → ownership/visibility check → controller
router.patch(
  '/reports/:id/read',
  validateRequest({ params: reportReadParamsSchema }),
  assertParentOwnsReport,
  markReportAsRead
);

module.exports = router;

