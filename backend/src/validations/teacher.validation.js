/**
 * teacher.validation.js
 *
 * Zod schemas for all Teacher write endpoints.
 * These schemas are additive — they layer on top of the existing express-validator
 * chains without replacing them. They provide strict type coercion and field
 * validation that complements the lightweight express-validator rules.
 *
 * Zod v4 is already installed in this project.
 */

const { z } = require('zod');

// ─── Shared primitives ────────────────────────────────────────────────────────

const mongoIdSchema = z
  .string({ required_error: 'ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid MongoDB ObjectId');

// Fractional Juz portions used in Dowra / Sabqi quick picks
const JUZU_PORTIONS = ['1/4', '1/2', '3/4', '1', ''];

const CATEGORIES = ['Noorani Qaida', 'Hifz', 'Dowra', 'Regular'];

const ISSUE_TYPES = ['Academic Struggle', 'Frequent Absence', 'Behavioral', 'Other'];

const RECIPIENTS = ['Admin', 'Parent', 'Both'];

// ─── POST /teacher/progress ───────────────────────────────────────────────────

/**
 * Schema for a single progress entry within the `entries` array.
 * All lesson-count fields are optional — at least one must be provided
 * by business logic in the controller (absent students zero everything out).
 */
const progressEntrySchema = z.object({
  studentId: mongoIdSchema,

  // Noorani Qaida / new lesson lines (0–999)
  puthiyaPadam: z
    .number({ invalid_type_error: 'puthiyaPadam must be a number' })
    .int('puthiyaPadam must be an integer')
    .min(0, 'puthiyaPadam must be ≥ 0')
    .max(999, 'puthiyaPadam must be ≤ 999')
    .optional(),

  // Juz number — supports up to 100 to cover Qaida lesson numbers too
  juzuNumber: z
    .number({ invalid_type_error: 'juzuNumber must be a number' })
    .int('juzuNumber must be an integer')
    .min(1, 'juzuNumber must be ≥ 1')
    .max(100, 'juzuNumber must be ≤ 100')
    .nullish(),

  // Dowra cycle count
  dowraCount: z
    .number({ invalid_type_error: 'dowraCount must be a number' })
    .int('dowraCount must be an integer')
    .min(0, 'dowraCount must be ≥ 0')
    .max(999, 'dowraCount must be ≤ 999')
    .optional(),

  // Old lesson (Sabqi) — pages revised
  pazhayaPadam: z
    .number({ invalid_type_error: 'pazhayaPadam must be a number' })
    .int('pazhayaPadam must be an integer')
    .min(0, 'pazhayaPadam must be ≥ 0')
    .max(999, 'pazhayaPadam must be ≤ 999')
    .optional(),

  // Juz portion for Dowra mode quick pills: '1/4' | '1/2' | '3/4' | '1' | ''
  juzuPadamPortion: z
    .enum(JUZU_PORTIONS, {
      errorMap: () => ({ message: `juzuPadamPortion must be one of: ${JUZU_PORTIONS.join(', ')}` }),
    })
    .optional(),

  // Hifz mode: current Sabqi fractional portion
  juzuPadam: z
    .number({ invalid_type_error: 'juzuPadam must be a number' })
    .min(0, 'juzuPadam must be ≥ 0')
    .max(999, 'juzuPadam must be ≤ 999')
    .optional(),

  // Student category (determines which fields are rendered/relevant)
  category: z
    .enum(CATEGORIES, {
      errorMap: () => ({ message: `category must be one of: ${CATEGORIES.join(', ')}` }),
    })
    .optional(),

  isAbsent: z.boolean({ invalid_type_error: 'isAbsent must be a boolean' }).optional(),

  needsRevision: z.boolean({ invalid_type_error: 'needsRevision must be a boolean' }).optional(),

  isPuthiyaPadamWrong: z.boolean({ invalid_type_error: 'isPuthiyaPadamWrong must be a boolean' }).optional(),

  isCurrentLessonWrong: z.boolean({ invalid_type_error: 'isCurrentLessonWrong must be a boolean' }).optional(),

  isPazhayaPadamWrong: z.boolean({ invalid_type_error: 'isPazhayaPadamWrong must be a boolean' }).optional(),

  notes: z
    .string({ invalid_type_error: 'notes must be a string' })
    .max(500, 'notes must not exceed 500 characters')
    .trim()
    .optional(),
});

/**
 * Top-level schema for POST /teacher/progress
 * `date` is optional — defaults to today in the controller.
 */
const submitProgressBodySchema = z.object({
  entries: z
    .array(progressEntrySchema, { required_error: 'entries is required' })
    .min(1, 'entries must have at least 1 item')
    .max(200, 'entries must not exceed 200 items'),

  date: z
    .string()
    .datetime({ message: 'date must be a valid ISO 8601 datetime string' })
    .optional()
    .or(z.literal('')),
});

// ─── POST /teacher/flag ───────────────────────────────────────────────────────

const flagStudentBodySchema = z.object({
  studentId: mongoIdSchema,

  issueType: z.enum(ISSUE_TYPES, {
    required_error: 'issueType is required',
    errorMap: () => ({ message: `issueType must be one of: ${ISSUE_TYPES.join(', ')}` }),
  }),

  recipient: z.enum(RECIPIENTS, {
    required_error: 'recipient is required',
    errorMap: () => ({ message: `recipient must be one of: ${RECIPIENTS.join(', ')}` }),
  }),

  notes: z
    .string({ invalid_type_error: 'notes must be a string' })
    .max(1000, 'notes must not exceed 1000 characters')
    .trim()
    .optional(),
});

// ─── PATCH /teacher/feedbacks/:id/read ────────────────────────────────────────

const feedbackReadParamsSchema = z.object({
  id: mongoIdSchema.describe('Feedback MongoDB ObjectId'),
});

// ─── DELETE /teacher/needs-attention/:id ─────────────────────────────────────

const needsAttentionParamsSchema = z.object({
  id: mongoIdSchema.describe('Student MongoDB ObjectId for needs-attention record'),
});

module.exports = {
  submitProgressBodySchema,
  flagStudentBodySchema,
  feedbackReadParamsSchema,
  needsAttentionParamsSchema,
};
