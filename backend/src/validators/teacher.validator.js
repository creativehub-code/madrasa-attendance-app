const { body } = require('express-validator');

const progressEntryRules = [
  body('studentId')
    .notEmpty()
    .withMessage('studentId is required')
    .isMongoId()
    .withMessage('studentId must be a valid MongoDB ObjectId'),
  body('puthiyaPadamLines')
    .optional()
    .isInt({ min: 0, max: 999 })
    .withMessage('puthiyaPadamLines must be 0–999')
    .toInt(),
  body('juzuNumber')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 30 })
    .withMessage('juzuNumber must be 1–30')
    .toInt(),
  body('pazhayaPadamPages')
    .optional()
    .isInt({ min: 0, max: 999 })
    .withMessage('pazhayaPadamPages must be 0–999')
    .toInt(),
  body('juzuPadamPortion')
    .optional()
    .isString()
    .isIn(['1/4', '1/2', '3/4', '1', ''])
    .withMessage('Invalid juzuPadamPortion'),
  body('isAbsent')
    .optional()
    .isBoolean()
    .withMessage('isAbsent must be a boolean')
    .toBoolean(),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date')
    .toDate(),
];

const submitProgressValidator = [
  body('entries')
    .isArray({ min: 1, max: 200 })
    .withMessage('entries must be an array with 1–200 items'),
  body('entries.*.studentId')
    .notEmpty()
    .withMessage('Each entry must have a studentId')
    .isMongoId()
    .withMessage('studentId must be a valid MongoDB ObjectId'),
  body('entries.*.puthiyaPadamLines')
    .optional()
    .isInt({ min: 0, max: 999 })
    .withMessage('puthiyaPadamLines must be 0–999')
    .toInt(),
  body('entries.*.juzuNumber')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('juzuNumber / lessonNumber must be 1–100')
    .toInt(),
  body('entries.*.dowraCount')
    .optional()
    .isInt({ min: 0, max: 999 })
    .withMessage('dowraCount must be 0–999')
    .toInt(),
  body('entries.*.category')
    .optional()
    .isIn(['Noorani Qaida', 'Dowra', 'Regular'])
    .withMessage('Invalid category'),
  body('entries.*.pazhayaPadamPages')
    .optional()
    .isInt({ min: 0, max: 999 })
    .withMessage('pazhayaPadamPages must be 0–999')
    .toInt(),
  body('entries.*.juzuPadamPortion')
    .optional()
    .isString()
    .isIn(['1/4', '1/2', '3/4', '1', ''])
    .withMessage('Invalid juzuPadamPortion'),
  body('entries.*.isAbsent')
    .optional()
    .isBoolean()
    .withMessage('isAbsent must be a boolean')
    .toBoolean(),
  body('entries.*.isPuthiyaPadamWrong')
    .optional()
    .isBoolean()
    .withMessage('isPuthiyaPadamWrong must be a boolean')
    .toBoolean(),
  body('entries.*.isCurrentLessonWrong')
    .optional()
    .isBoolean()
    .withMessage('isCurrentLessonWrong must be a boolean')
    .toBoolean(),
  body('entries.*.isPazhayaPadamWrong')
    .optional()
    .isBoolean()
    .withMessage('isPazhayaPadamWrong must be a boolean')
    .toBoolean(),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date')
    .toDate(),
];

module.exports = { progressEntryRules, submitProgressValidator };
