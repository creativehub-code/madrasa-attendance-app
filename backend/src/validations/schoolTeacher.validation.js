const { z } = require('zod');

const mongoIdSchema = z
  .string({ required_error: 'ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid MongoDB ObjectId');

const createSchoolProgressBodySchema = z.object({
  className: z
    .string({ required_error: 'Class name is required' })
    .min(1, 'Class name cannot be empty')
    .trim(),
  subject: z
    .string({ required_error: 'Subject is required' })
    .min(1, 'Subject cannot be empty')
    .trim(),
  unitTaught: z
    .string({ required_error: 'Unit taught is required' })
    .min(1, 'Unit taught cannot be empty')
    .trim(),
  description: z.string().optional(),
  date: z.string().optional(),
  academicYear: z.string().optional(),
  absentStudents: z.array(mongoIdSchema).optional(),
});

const getSchoolProgressQuerySchema = z.object({
  className: z.string().optional(),
  academicYear: z.string().optional(),
  date: z.string().optional(),
});

module.exports = {
  createSchoolProgressBodySchema,
  getSchoolProgressQuerySchema,
};
