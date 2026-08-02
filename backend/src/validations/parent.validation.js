/**
 * parent.validation.js
 *
 * Zod schemas for all Parent write endpoints.
 * Complements the existing express-validator sendFeedbackValidator without replacing it.
 *
 * Zod v4 is already installed in this project.
 */

const { z } = require('zod');

// ─── Shared primitives ────────────────────────────────────────────────────────

const mongoIdSchema = z
  .string({ required_error: 'ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid MongoDB ObjectId');

// ─── POST /parent/feedback ────────────────────────────────────────────────────

/**
 * Parent sends a feedback/message to the teacher via the dashboard.
 * `studentId` comes from req.query (set by assertParentOwnsStudent middleware),
 * so the body only needs the message content.
 */
const sendFeedbackBodySchema = z.object({
  message: z
    .string({ required_error: 'Message is required', invalid_type_error: 'Message must be a string' })
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must not exceed 1000 characters')
    .trim(),

  date: z
    .string()
    .datetime({ message: 'date must be a valid ISO 8601 datetime string' })
    .optional()
    .or(z.literal('')),
});

// ─── PATCH /parent/reports/:id/read ──────────────────────────────────────────

/**
 * Validates the route param before assertParentOwnsReport middleware runs.
 * This prevents a MongoDB CastError from an invalid ObjectId format.
 */
const reportReadParamsSchema = z.object({
  id: mongoIdSchema.describe('IssueReport MongoDB ObjectId'),
});

// ─── GET /parent/progress/daily (query params) ────────────────────────────────

const dailyProgressQuerySchema = z.object({
  studentId: mongoIdSchema.describe('Student MongoDB ObjectId').optional(),

  date: z
    .string()
    .datetime({ message: 'date must be a valid ISO 8601 datetime string' })
    .optional(),
});

// ─── GET /parent/progress/monthly (query params) ──────────────────────────────

const monthlyProgressQuerySchema = z.object({
  studentId: mongoIdSchema.describe('Student MongoDB ObjectId').optional(),

  year: z
    .coerce.number({ invalid_type_error: 'year must be a number' })
    .int('year must be an integer')
    .min(2020, 'year must be ≥ 2020')
    .max(2100, 'year must be ≤ 2100')
    .optional(),

  month: z
    .coerce.number({ invalid_type_error: 'month must be a number' })
    .int('month must be an integer')
    .min(1, 'month must be 1–12')
    .max(12, 'month must be 1–12')
    .optional(),
});

module.exports = {
  sendFeedbackBodySchema,
  reportReadParamsSchema,
  dailyProgressQuerySchema,
  monthlyProgressQuerySchema,
};
