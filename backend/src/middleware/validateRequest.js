/**
 * validateRequest.js
 *
 * A reusable Zod-based validation middleware factory.
 * Takes a Zod schema object with optional `body`, `query`, and `params` keys.
 *
 * Usage:
 *   router.post('/flag', teacherOnly, validateRequest({ body: flagSchema }), flagStudentIssue);
 *
 * On validation failure → 400 Bad Request with a structured `errors` array.
 * On success → passes parsed (coerced) data back onto req.body / req.query / req.params.
 *
 * Non-destructive: does not alter any existing express-validator middleware chains.
 */

const { ZodError } = require('zod');

/**
 * @param {{ body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }} schemas
 */
const validateRequest = (schemas) => (req, res, next) => {
  const errors = [];

  const targets = ['body', 'query', 'params'];

  for (const target of targets) {
    if (!schemas[target]) continue;

    const result = schemas[target].safeParse(req[target]);

    if (!result.success) {
      // Flatten Zod error messages, prefixing with the source target
      const flat = result.error.flatten();

      // Field-level errors
      for (const [field, messages] of Object.entries(flat.fieldErrors)) {
        for (const msg of messages) {
          errors.push({ target, field, message: msg });
        }
      }

      // Top-level (root) errors
      for (const msg of flat.formErrors) {
        errors.push({ target, field: '_root', message: msg });
      }
    } else {
      // Write back coerced / transformed data so controllers receive clean types
      req[target] = result.data;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.map((e) => e.message).join(', '),
      errors,
    });
  }

  next();
};

module.exports = { validateRequest };
