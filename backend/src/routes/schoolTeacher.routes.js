const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  createSchoolProgressBodySchema,
  getSchoolProgressQuerySchema,
} = require('../validations/schoolTeacher.validation');
const {
  getClassesAndStudents,
  createSchoolProgress,
  getSchoolProgress,
} = require('../controllers/schoolTeacher.controller');

const router = express.Router();

router.use(protect);

const schoolTeacherOrAdmin = authorize('school_teacher', 'SchoolTeacher', 'Admin');
const schoolTeacherOnly = authorize('school_teacher', 'SchoolTeacher');

router.get('/classes', schoolTeacherOrAdmin, getClassesAndStudents);
router.post(
  '/progress',
  schoolTeacherOnly,
  validateRequest({ body: createSchoolProgressBodySchema }),
  createSchoolProgress
);
router.get(
  '/progress',
  schoolTeacherOrAdmin,
  validateRequest({ query: getSchoolProgressQuerySchema }),
  getSchoolProgress
);

module.exports = router;

