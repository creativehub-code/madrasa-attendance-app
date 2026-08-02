const { body } = require('express-validator');

const sendFeedbackValidator = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message must not exceed 1000 characters')
    .escape(),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date')
    .toDate(),
];

module.exports = { sendFeedbackValidator };
