const { Examination, ExamMark, Syllabus, Announcement } = require('../models');
const { AppError, asyncHandler } = require('../utils/asyncHandler');

// ─── EXAMINATIONS ─────────────────────────────────────────────────────────────

/**
 * @desc   Create new examination & send notification announcement to class teachers
 * @route  POST /api/academic/exams
 * @access Admin
 */
const createExam = asyncHandler(async (req, res) => {
  const { title, startDate, endDate, standards, passingMarks, totalMarks } = req.body;

  if (!title || !startDate || !endDate || !standards || !Array.isArray(standards) || standards.length === 0) {
    throw new AppError('Exam title, start date, end date, and at least one target class are required.', 400);
  }

  const exam = await Examination.create({
    title: title.trim(),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    standards,
    passingMarks: passingMarks !== undefined ? Number(passingMarks) : 35,
    totalMarks: totalMarks !== undefined ? Number(totalMarks) : 100,
    createdBy: req.user?._id,
  });

  // Format dates for announcement
  const startStr = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endStr = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const classesList = standards.join(', ');

  const announcementMessage = `📢 Examination Scheduled: "${title.trim()}" is set from ${startStr} to ${endStr} for Class(es): ${classesList}. Enter Marks section is now unlocked on your dashboard.`;

  // Create automatic notification announcement
  await Announcement.create({
    message: announcementMessage,
    date: new Date(),
    createdBy: req.user?._id,
  });

  res.status(201).json({
    success: true,
    data: { exam },
    message: 'Examination scheduled successfully and teachers notified.',
  });
});

/**
 * @desc   Get list of examinations (optionally filtered by standard)
 * @route  GET /api/academic/exams
 * @access Admin, Teacher, school_teacher
 */
const getExams = asyncHandler(async (req, res) => {
  const { standard } = req.query;

  let filter = {};
  if (standard) {
    filter.standards = { $in: [standard] };
  }

  const exams = await Examination.find(filter).sort({ startDate: -1 });

  res.status(200).json({
    success: true,
    data: { exams },
  });
});

/**
 * @desc   Submit or update student exam marks efficiently using bulkWrite
 * @route  POST /api/academic/exams/:examId/marks
 * @access Teacher, school_teacher, Admin
 */
const submitExamMarks = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { marks, standard } = req.body;

  if (!marks || !Array.isArray(marks) || marks.length === 0) {
    throw new AppError('An array of student marks is required.', 400);
  }

  const exam = await Examination.findById(examId);
  if (!exam) {
    throw new AppError('Examination not found.', 404);
  }

  // Use MongoDB bulkWrite for performance optimization
  const bulkOps = marks.map((item) => ({
    updateOne: {
      filter: {
        examId,
        studentId: item.studentId,
      },
      update: {
        $set: {
          teacherId: req.user._id,
          standard: standard || item.standard || exam.standards[0] || '1st Standard',
          marks: Number(item.marks),
          maxMarks: item.maxMarks !== undefined ? Number(item.maxMarks) : exam.totalMarks || 100,
          subject: item.subject || 'General',
          remarks: item.remarks || '',
        },
      },
      upsert: true,
    },
  }));

  await ExamMark.bulkWrite(bulkOps);

  res.status(200).json({
    success: true,
    message: 'Student marks submitted successfully.',
  });
});

/**
 * @desc   Get submitted marks for an examination
 * @route  GET /api/academic/exams/:examId/marks
 * @access Admin, Teacher, school_teacher
 */
const getExamMarks = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { standard } = req.query;

  let filter = { examId };
  if (standard) {
    filter.standard = standard;
  }

  // Data Privacy: Non-Admin users (Teacher / school_teacher) can ONLY retrieve marks for their assigned class / teacherId
  if (req.user.role !== 'Admin') {
    filter.teacherId = req.user._id;
  }

  const marks = await ExamMark.find(filter)
    .populate('studentId', 'name admissionNumber standard')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: { marks },
  });
});

// ─── SYLLABUS ─────────────────────────────────────────────────────────────────

/**
 * @desc   Define or update subjects for a standard/class
 * @route  POST /api/academic/syllabus
 * @access Admin
 */
const updateSyllabus = asyncHandler(async (req, res) => {
  const { standard, subjects } = req.body;

  if (!standard || !Array.isArray(subjects)) {
    throw new AppError('Standard name and subjects array are required.', 400);
  }

  const cleanSubjects = subjects.map((s) => String(s).trim()).filter(Boolean);

  const syllabus = await Syllabus.findOneAndUpdate(
    { standard: standard.trim() },
    {
      standard: standard.trim(),
      subjects: cleanSubjects,
      updatedBy: req.user?._id,
    },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: { syllabus },
    message: `Syllabus for ${standard} updated successfully.`,
  });
});

/**
 * @desc   Get syllabus list or get by standard
 * @route  GET /api/academic/syllabus
 * @access Admin, Teacher, school_teacher
 */
const getSyllabus = asyncHandler(async (req, res) => {
  const { standard } = req.query;

  if (standard) {
    const syllabus = await Syllabus.findOne({ standard: standard.trim() });
    return res.status(200).json({
      success: true,
      data: { syllabus: syllabus || null },
    });
  }

  const list = await Syllabus.find().sort({ standard: 1 });
  res.status(200).json({
    success: true,
    data: { syllabusList: list },
  });
});

module.exports = {
  createExam,
  getExams,
  submitExamMarks,
  getExamMarks,
  updateSyllabus,
  getSyllabus,
};
