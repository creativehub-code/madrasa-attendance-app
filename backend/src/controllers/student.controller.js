const Student = require('../models/Student');
const { asyncHandler } = require('../utils/asyncHandler');
const z = require('zod');

/**
 * @desc    Update a student's current Juzu
 * @route   PATCH /api/students/:studentId/juzu
 * @access  Private (Teacher only)
 */
exports.updateStudentJuzu = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  
  // Zod validation for juzuNumber
  const schema = z.object({
    juzuNumber: z.coerce.number().int().min(1).max(30)
  });
  
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Juzu number. Must be an integer between 1 and 30.',
      errors: parsed.error.errors,
    });
  }
  
  const { juzuNumber } = parsed.data;

  // Find the student
  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found.',
    });
  }

  // Check if student status is Discontinued
  if (student.status === 'Discontinued') {
    return res.status(403).json({
      success: false,
      message: 'Cannot update Juzu for discontinued student.',
    });
  }

  // Security & IDOR Check: Ensure the student belongs to the logged-in teacher
  if (student.teacherId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. You do not have permission to update this student.',
    });
  }

  // Update Juzu
  student.currentJuzu = juzuNumber;
  await student.save();

  res.status(200).json({
    success: true,
    data: {
      student,
    },
  });
});
