const { body, param } = require('express-validator');

const createUserValidator = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3–50 characters')
    .escape(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isString()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6–128 characters'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['Teacher', 'Parent', 'Admin'])
    .withMessage('Role must be Teacher, Parent or Admin'),
];

const bulkStudentsValidator = [
  body('students')
    .isArray({ min: 1, max: 200 })
    .withMessage('students must be an array with 1–200 items'),
  body('students.*.name')
    .trim()
    .notEmpty()
    .withMessage('Each student must have a name')
    .isLength({ max: 100 })
    .escape(),
  body('students.*.admissionNumber')
    .trim()
    .notEmpty()
    .withMessage('Each student must have an admissionNumber')
    .isLength({ max: 50 })
    .escape(),
  body('students.*.teacherId')
    .notEmpty()
    .withMessage('Each student must have a teacherId')
    .isMongoId()
    .withMessage('teacherId must be a valid MongoDB ObjectId'),
  body('students.*.parentId')
    .notEmpty()
    .withMessage('Each student must have a parentId')
    .isMongoId()
    .withMessage('parentId must be a valid MongoDB ObjectId'),
];

// Simplified single-step student creation (used by the Admin UI form)
const createStudentValidator = [
  body('studentName')
    .trim()
    .notEmpty()
    .withMessage('Student name is required')
    .isLength({ max: 100 })
    .escape(),
  body('standard')
    .optional({ checkFalsy: true })
    .trim()
    .escape(),
  body('section')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Section must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Section must not exceed 50 characters')
    .customSanitizer((val) => (typeof val === 'string' ? val.replace(/[<>]/g, '').trim() : val)),
  body('className')
    .optional({ checkFalsy: true })
    .trim()
    .escape(),
  body('classId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('classId must be a valid MongoDB ObjectId'),
  body('teacherId')
    .notEmpty()
    .withMessage('Teacher is required')
    .isMongoId()
    .withMessage('teacherId must be a valid MongoDB ObjectId'),
  body('existingParentId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('existingParentId must be a valid MongoDB ObjectId'),
  body('parentUsername')
    .if(body('existingParentId').not().exists({ checkFalsy: true }))
    .trim()
    .notEmpty()
    .withMessage('Parent username is required when not selecting an existing parent')
    .isLength({ min: 3, max: 50 })
    .withMessage('Parent username must be 3–50 characters')
    .escape(),
  body('parentPassword')
    .if(body('existingParentId').not().exists({ checkFalsy: true }))
    .notEmpty()
    .withMessage('Parent password (contact phone) is required when not selecting an existing parent')
    .isLength({ min: 6, max: 128 })
    .withMessage('Parent password must be at least 6 characters'),
];

// Single-step teacher creation (used by the Admin UI form)
const createTeacherValidator = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username / email is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be 3–100 characters')
    .escape(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isString()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6–128 characters'),
  body('fullName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name must not exceed 100 characters')
    .escape(),
];

const createAnnouncementValidator = [
  body('message')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message must not exceed 2000 characters')
    .escape(),
  body('subject')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Subject must not exceed 500 characters')
    .escape(),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date')
    .toDate(),
];

const reportActionValidator = [
  param('id')
    .isMongoId()
    .withMessage('Report ID must be a valid MongoDB ObjectId'),
  body('action')
    .trim()
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['Agreed', 'Rejected'])
    .withMessage('Action must be either Agreed or Rejected'),
];

const reportParamIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Report ID must be a valid MongoDB ObjectId'),
];

module.exports = {
  createUserValidator,
  bulkStudentsValidator,
  createStudentValidator,
  createTeacherValidator,
  createAnnouncementValidator,
  reportActionValidator,
  reportParamIdValidator,
};
