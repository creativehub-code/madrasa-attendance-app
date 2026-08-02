const { Student, Progress, Announcement, Feedback, SchoolProgress, IssueReport } = require('../models');
const { AppError, asyncHandler } = require('../utils/asyncHandler');

const startOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getDailyProgress = asyncHandler(async (req, res) => {
  const student = req.student;
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const progress = await Progress.findOne({
    studentId: student._id,
    date: { $gte: todayStart, $lte: todayEnd },
  });

  const studentClass = student.standard || student.className || '';

  const schoolProgress = studentClass
    ? await SchoolProgress.find({
        className: studentClass,
        academicYear: student.academicYear || '2025-2026',
        date: { $gte: todayStart, $lte: todayEnd },
        absentStudents: { $ne: student._id },
      }).sort({ date: -1 })
    : [];

  res.json({
    success: true,
    data: {
      student: {
        id: student._id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        standard: studentClass,
        className: studentClass,
        section: student.section || '',
        category: student.category || '',
        dowraCount: student.dowraCount || 1,
        academicYear: student.academicYear || '',
      },
      progress: progress || null,
      schoolProgress: schoolProgress || [],
    },
  });
});

const getMonthlyProgress = asyncHandler(async (req, res) => {
  const student = req.student;
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;

  if (month < 1 || month > 12) {
    throw new AppError('month must be between 1 and 12', 400);
  }

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const progress = await Progress.find({
    studentId: student._id,
    date: { $gte: rangeStart, $lte: rangeEnd },
  }).sort({ date: 1 });

  const studentClass = student.standard || student.className || '';

  const schoolProgress = studentClass
    ? await SchoolProgress.find({
        className: studentClass,
        academicYear: student.academicYear || '2025-2026',
        date: { $gte: rangeStart, $lte: rangeEnd },
        absentStudents: { $ne: student._id },
      }).sort({ date: 1 })
    : [];

  res.json({
    success: true,
    data: {
      student: {
        id: student._id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        className: studentClass,
        standard: studentClass,
        section: student.section || '',
        category: student.category || '',
        dowraCount: student.dowraCount || 1,
        academicYear: student.academicYear || '',
      },
      year,
      month,
      progress,
      schoolProgress: schoolProgress || [],
    },
  });
});

const getAnnouncements = asyncHandler(async (_req, res) => {
  const announcements = await Announcement.find()
    .sort({ date: -1 })
    .limit(50)
    .select('message date createdAt');

  res.json({ success: true, data: { announcements } });
});

const sendFeedback = asyncHandler(async (req, res) => {
  const student = req.student;
  const { message, date } = req.body;

  const feedback = await Feedback.create({
    parentId: req.user._id,
    teacherId: student.teacherId,
    studentId: student._id,
    message,
    date: date || new Date(),
  });

  res.status(201).json({ success: true, data: { feedback } });
});

const getParentChildren = asyncHandler(async (req, res) => {
  const students = await Student.find({
    parentId: req.user._id,
    isActive: true,
  })
    .select('_id name admissionNumber className standard section category currentJuzu dowraCount needsRevision revisionReason')
    .lean();

  const children = students.map((s) => ({
    id: s._id,
    name: s.name,
    admissionNumber: s.admissionNumber,
    rollNo: s.admissionNumber,
    className: s.standard || s.className || '',
    section: s.section || '',
    category: s.category || '',
    dowraCount: s.dowraCount || 1,
    currentJuzuNumber: s.currentJuzu || 1,
    needsRevision: s.needsRevision || false,
    revisionReason: s.revisionReason || '',
  }));

  res.json({ success: true, data: { children } });
});

// ─── GET /parent/reports ────────────────────────────────────────────────────────

const getParentReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // First, get all student IDs for this parent
  const students = await Student.find({ parentId: req.user._id, isActive: true }).select('_id').lean();
  const studentIds = students.map(s => s._id);

  const filter = {
    studentId: { $in: studentIds },
    recipient: { $in: ['Parent', 'Both'] }
  };

  const [reports, totalReports] = await Promise.all([
    IssueReport.find(filter)
      .populate('studentId', 'name admissionNumber className')
      .populate('teacherId', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    IssueReport.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReports / limit),
        totalReports,
      },
    },
  });
});

// ─── PATCH /parent/reports/:id/read ──────────────────────────────────────────────

const markReportAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await IssueReport.findById(id);

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  // Ensure the recipient is either 'Parent' or 'Both'
  if (report.recipient !== 'Parent' && report.recipient !== 'Both') {
    throw new AppError('Not authorized to access this report', 403);
  }

  // Ensure the report belongs to a student of this parent
  const student = await Student.findOne({ _id: report.studentId, parentId: req.user._id });
  if (!student) {
    throw new AppError('Not authorized to access this report', 403);
  }

  report.isReadByParent = true;
  await report.save();

  res.json({ success: true, data: { message: 'Report marked as read' } });
});

module.exports = {
  getParentChildren,
  getDailyProgress,
  getMonthlyProgress,
  getAnnouncements,
  sendFeedback,
  getParentReports,
  markReportAsRead,
};
