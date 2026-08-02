const { Student, SchoolProgress } = require('../models');
const { AppError, asyncHandler } = require('../utils/asyncHandler');
const { logActivity } = require('../utils/logger');

/**
 * Helper to calculate start of day (00:00:00.000)
 */
const getStartOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Helper to calculate end of day (23:59:59.999)
 */
const getEndOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * @desc Get all active classes and their respective students for school teacher
 * @route GET /api/school-teacher/classes
 * @access Private (School Teacher / Admin)
 */
const getClassesAndStudents = asyncHandler(async (_req, res) => {
  const students = await Student.find({ isActive: true })
    .select('_id name admissionNumber standard academicYear')
    .sort({ standard: 1, name: 1 })
    .lean();

  // Group students by standard
  const classMap = new Map();

  students.forEach((student) => {
    const cName = student.standard || '1st Standard';
    if (!classMap.has(cName)) {
      classMap.set(cName, []);
    }
    classMap.get(cName).push({
      _id: student._id,
      name: student.name,
      admissionNumber: student.admissionNumber,
      standard: student.standard || '1st Standard',
      className: student.standard || '1st Standard',
      academicYear: student.academicYear || '2025-2026',
    });
  });

  const classes = Array.from(classMap.entries()).map(([className, studentList]) => ({
    className,
    standard: className,
    studentCount: studentList.length,
    students: studentList,
  }));

  res.json({
    success: true,
    data: { classes },
  });
});

/**
 * @desc Create or update (upsert) daily school progress for an entire class
 * @route POST /api/school-teacher/progress
 * @access Private (School Teacher / Admin)
 */
const createSchoolProgress = asyncHandler(async (req, res) => {
  const { className, subject, unitTaught, description, date, academicYear, absentStudents } = req.body;

  if (!className || !className.trim()) {
    throw new AppError('Class name is required', 400);
  }
  if (!subject || !subject.trim()) {
    throw new AppError('Subject is required', 400);
  }
  if (!unitTaught || !unitTaught.trim()) {
    throw new AppError('Unit taught is required', 400);
  }

  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = getStartOfDay(targetDate);
  const endOfDay = getEndOfDay(targetDate);

  const filter = {
    className: className.trim(),
    subject: subject.trim(),
    academicYear: (academicYear || '2025-2026').trim(),
    teacherId: req.user._id,
    date: { $gte: startOfDay, $lte: endOfDay },
  };

  const updateDoc = {
    $set: {
      className: className.trim(),
      subject: subject.trim(),
      unitTaught: unitTaught.trim(),
      description: (description || '').trim(),
      academicYear: (academicYear || '2025-2026').trim(),
      date: startOfDay,
      teacherId: req.user._id,
      absentStudents: Array.isArray(absentStudents) ? absentStudents : [],
    },
  };

  // Upsert matching className, subject, academicYear, teacherId, and normalized date
  const progress = await SchoolProgress.findOneAndUpdate(filter, updateDoc, {
    upsert: true,
    new: true,
    runValidators: true,
  }).populate('absentStudents', '_id name admissionNumber');

  await logActivity({
    actionType: 'ATTENDANCE_MARKED',
    message: `${req.user?.username || 'School Teacher'} marked school progress for ${className.trim()}`,
    performedById: req.user?._id,
  });

  res.status(200).json({
    success: true,
    message: 'School progress saved successfully',
    data: { progress },
  });
});

/**
 * @desc Fetch school progress entries for a class / date
 * @route GET /api/school-teacher/progress
 * @access Private (School Teacher / Admin)
 */
const getSchoolProgress = asyncHandler(async (req, res) => {
  const { className, date, academicYear } = req.query;

  const query = {};

  if (className) {
    query.className = className;
  }
  if (academicYear) {
    query.academicYear = academicYear;
  }
  if (date) {
    const startOfDay = getStartOfDay(date);
    const endOfDay = getEndOfDay(date);
    query.date = { $gte: startOfDay, $lte: endOfDay };
  }

  const progressList = await SchoolProgress.find(query)
    .sort({ date: -1, createdAt: -1 })
    .populate('absentStudents', '_id name admissionNumber')
    .lean();

  res.json({
    success: true,
    data: { progress: progressList },
  });
});

module.exports = {
  getClassesAndStudents,
  createSchoolProgress,
  getSchoolProgress,
};
