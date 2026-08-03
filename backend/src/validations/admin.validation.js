const { z } = require('zod');

const mongoIdSchema = z
  .string({ required_error: 'ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid MongoDB ObjectId');

const createAdminStudentBodySchema = z.object({
  studentName: z
    .string({ required_error: 'Student name is required' })
    .min(1, 'Student name cannot be empty')
    .max(100, 'Student name must not exceed 100 characters')
    .trim(),
  standard: z.string().optional(),
  section: z.string().max(50).optional(),
  className: z.string().optional(),
  classId: mongoIdSchema.optional().or(z.literal('')),
  teacherId: mongoIdSchema,
  existingParentId: mongoIdSchema.optional().or(z.literal('')),
  parentUsername: z.string().min(3).max(50).trim().optional(),
  parentPassword: z.string().min(6).max(128).optional(),
});

const createAdminTeacherBodySchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username must not exceed 100 characters')
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters'),
  fullName: z.string().max(100).optional(),
  role: z.enum(['Teacher', 'school_teacher']).optional(),
  standards: z.array(z.string().max(50)).max(15).optional(),
  assignedClass: mongoIdSchema.optional().or(z.literal('')),
  assignedClassName: z.string().max(100).optional(),
});

const teacherIdParamsSchema = z.object({
  id: mongoIdSchema,
});

const createAnnouncementBodySchema = z.object({
  message: z.string().max(2000).optional(),
  subject: z.string().max(500).optional(),
  date: z.string().optional(),
});

const updateStudentParamsSchema = z.object({
  id: mongoIdSchema,
});

const updateStudentBodySchema = z.object({
  name: z.string().max(100).optional(),
  standard: z.string().optional(),
  section: z.string().max(50).optional(),
  teacherId: mongoIdSchema.optional(),
  status: z.enum(['Active', 'Discontinued']).optional(),
  classId: mongoIdSchema.nullable().optional().or(z.literal('')),
  className: z.string().optional(),
});

const reportActionParamsSchema = z.object({
  id: mongoIdSchema,
});

const reportActionBodySchema = z.object({
  action: z.enum(['Agreed', 'Rejected']),
});

const reportDeleteParamsSchema = z.object({
  id: mongoIdSchema,
});

const updateTeacherBodySchema = z.object({
  standards: z.array(z.string().max(50)).max(15).optional(),
  assignedClass: mongoIdSchema.optional().or(z.literal('')).nullable(),
  assignedClassName: z.string().max(100).optional(),
  status: z.enum(['Active', 'Terminated']).optional(),
  fullName: z.string().max(100).optional(),
});

module.exports = {
  createAdminStudentBodySchema,
  createAdminTeacherBodySchema,
  createAnnouncementBodySchema,
  updateStudentParamsSchema,
  updateStudentBodySchema,
  reportActionParamsSchema,
  reportActionBodySchema,
  reportDeleteParamsSchema,
  teacherIdParamsSchema,
  updateTeacherBodySchema,
};
