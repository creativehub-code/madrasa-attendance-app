const { Student, Progress, Feedback, User, MonthlySummary, IssueReport, Announcement } = require('../models');
const { AppError, asyncHandler } = require('../utils/asyncHandler');
const { logActivity } = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeDate = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid date', 400);
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

const getISTDateBounds = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const istString = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);
  const year = istDate.getFullYear();
  const month = istDate.getMonth();
  const date = istDate.getDate();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${year}-${pad(month + 1)}-${pad(date)}`;
  const start = new Date(`${dateStr}T00:00:00.000+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start, end };
};

// ─── GET /teacher/students ────────────────────────────────────────────────────

const getAssignedStudents = asyncHandler(async (req, res) => {
  // RBAC scoping: school teachers see students by assigned standards,
  // madrasa teachers see only their directly-assigned students
  const filter = { isActive: true };
  if (req.user.role === 'school_teacher' && req.user.standards?.length > 0) {
    filter.standard = { $in: req.user.standards };
  } else {
    filter.teacherId = req.user._id;
  }

  const students = await Student.find(filter)
    .select('name admissionNumber section className needsRevision revisionReason currentJuzu status')
    .sort({ status: 1, name: 1 })
    .lean();

  const studentIds = students.map((s) => s._id);

  // Fetch the latest Juzu number from progress records
  const latestProgress = await Progress.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    { $sort: { date: -1 } },
    { $group: { _id: '$studentId', juzuNumber: { $first: '$juzuNumber' } } },
  ]);

  const progressMap = {};
  latestProgress.forEach((p) => {
    progressMap[p._id.toString()] = p.juzuNumber;
  });

  // Fetch today's progress for these students
  const { start: todayStart, end: todayEnd } = getISTDateBounds();

  const todayProgressList = await Progress.find({
    studentId: { $in: studentIds },
    date: { $gte: todayStart, $lte: todayEnd },
  }).lean();

  const todayProgressMap = {};
  todayProgressList.forEach((p) => {
    todayProgressMap[p.studentId.toString()] = {
      juzuNumber: p.juzuNumber,
      puthiyaPadam: p.puthiyaPadam,
      juzuPadam: p.juzuPadam,
      pazhayaPadam: p.pazhayaPadam,
      dowraCount: p.dowraCount || 0,
      category: p.category || 'Regular',
      isAbsent: p.isAbsent,
      needsRevision: p.needsRevision,
      isPuthiyaPadamWrong: p.isPuthiyaPadamWrong || false,
      isCurrentLessonWrong: p.isCurrentLessonWrong || false,
      isPazhayaPadamWrong: p.pazhayaPadamWrong || p.isPazhayaPadamWrong || false,
      notes: p.notes,
    };
  });

  // Normalize response: use `rollNumber` alias for admissionNumber for frontend compatibility
  const studentsWithJuzu = students.map((s) => ({
    _id: s._id,
    name: s.name,
    rollNumber: s.admissionNumber, // frontend Student type expects `rollNumber`
    section: s.section,
    className: s.className,
    needsRevision: s.needsRevision,
    revisionReason: s.revisionReason,
    currentJuzu: progressMap[s._id.toString()] || s.currentJuzu || 1,
    status: s.status || 'Active',
    todayProgress: todayProgressMap[s._id.toString()] || null,
  }));

  res.json({ success: true, data: { students: studentsWithJuzu } });
});

// ─── GET /teacher/submission-status ───────────────────────────────────────────

const getTeacherSubmissionStatus = asyncHandler(async (req, res) => {
  const { start: todayStart, end: todayEnd } = getISTDateBounds();

  const filter = { isActive: true };
  if (req.user.role === 'school_teacher' && req.user.standards?.length > 0) {
    filter.standard = { $in: req.user.standards };
  } else {
    filter.teacherId = req.user._id;
  }

  const students = await Student.find(filter).select('_id').lean();

  const studentIds = students.map((s) => s._id);

  if (studentIds.length === 0) {
    return res.json({
      success: true,
      data: {
        isSubmittedToday: false,
        submittedCount: 0,
        totalStudents: 0,
      },
    });
  }

  const sampleProgress = await Progress.findOne({
    studentId: { $in: studentIds },
    date: { $gte: todayStart, $lte: todayEnd },
  }).select('isLocked');

  const todayProgressCount = sampleProgress ? studentIds.length : 0; // if one exists, all were bulk inserted usually
  const isSubmittedToday = !!sampleProgress && sampleProgress.isLocked;
  const isUnlocked = !!sampleProgress && !sampleProgress.isLocked;

  res.json({
    success: true,
    data: {
      isSubmittedToday,
      isUnlocked,
      submittedCount: todayProgressCount,
      totalStudents: studentIds.length,
    },
  });
});

// ─── POST /teacher/progress ───────────────────────────────────────────────────

const submitProgress = asyncHandler(async (req, res) => {
  const { entries, date: dateInput } = req.body;
  const progressDate = normalizeDate(dateInput);

  const { start: todayStart, end: todayEnd } = getISTDateBounds(progressDate);

  const studentIds = entries.map((e) => e.studentId);
  
  // Validate that no student is Discontinued
  const students = await Student.find({ _id: { $in: studentIds } }).select('status name').lean();
  const discontinuedStudents = students.filter(s => s.status === 'Discontinued');
  if (discontinuedStudents.length > 0) {
    throw new AppError(`Cannot add progress for discontinued student(s): ${discontinuedStudents.map(s => s.name).join(', ')}`, 403);
  }

  const existingProgress = await Progress.findOne({
    studentId: { $in: studentIds },
    date: { $gte: todayStart, $lte: todayEnd },
  }).select('isLocked');

  if (existingProgress && existingProgress.isLocked) {
    throw new AppError('Daily progress has already been submitted and is locked. Please request an Admin unlock to resubmit.', 400);
  }

  const operations = entries.map((entry) => {
    const isAbsent = Boolean(entry.isAbsent);

    return {
      updateOne: {
        filter: { studentId: entry.studentId, date: progressDate },
        update: {
          $set: {
            studentId: entry.studentId,
            teacherId: req.user._id,
            date: progressDate,
            juzuNumber: entry.juzuNumber ?? 1,
            puthiyaPadam: isAbsent ? 0 : (entry.puthiyaPadam ?? 0),
            unit: 'lines',
            juzuPadam: isAbsent ? 0 : (entry.juzuPadam ?? 0),
            pazhayaPadam: isAbsent ? 0 : (entry.pazhayaPadam ?? 0),
            dowraCount: entry.dowraCount ?? 0,
            category: entry.category || 'Regular',
            isAbsent,
            needsRevision: isAbsent ? false : Boolean(entry.needsRevision),
            isPuthiyaPadamWrong: isAbsent ? false : Boolean(entry.isPuthiyaPadamWrong),
            isCurrentLessonWrong: isAbsent ? false : Boolean(entry.isCurrentLessonWrong),
            isPazhayaPadamWrong: isAbsent ? false : Boolean(entry.isPazhayaPadamWrong),
            notes: entry.notes?.trim() || '',
            isLocked: true,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await Progress.bulkWrite(operations, { ordered: false });

  await logActivity({
    actionType: 'ATTENDANCE_MARKED',
    message: `${req.user?.username || 'Teacher'} marked progress for assigned students`,
    performedById: req.user?._id,
  });

  res.json({
    success: true,
    data: {
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      total: entries.length,
    },
  });
});

// ─── GET /teacher/class-summary ───────────────────────────────────────────────

const getClassSummary = asyncHandler(async (req, res) => {
  const { start: todayStart, end: todayEnd } = getISTDateBounds();

  const filter = { isActive: true };
  if (req.user.role === 'school_teacher' && req.user.standards?.length > 0) {
    filter.standard = { $in: req.user.standards };
  } else {
    filter.teacherId = req.user._id;
  }

  const students = await Student.find(filter)
    .select('_id name admissionNumber className needsRevision')
    .lean();

  const studentIds = students.map((s) => s._id);
  const totalEnrolled = students.length;

  // Today's progress records
  const todayProgress = await Progress.find({
    studentId: { $in: studentIds },
    date: { $gte: todayStart, $lte: todayEnd },
  })
    .select('studentId isAbsent needsRevision')
    .lean();

  const absentCount = todayProgress.filter((p) => p.isAbsent).length;
  const needsRevisionCount = students.filter((s) => s.needsRevision).length;
  const presentCount = totalEnrolled - absentCount;
  const attendancePercent =
    totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

  res.json({
    success: true,
    data: {
      totalEnrolled,
      presentCount,
      absentCount,
      attendancePercent,
      needsRevisionCount,
    },
  });
});

// ─── GET /teacher/needs-attention ─────────────────────────────────────────────

const getNeedsAttention = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.user.role === 'school_teacher' && req.user.standards?.length > 0) {
    filter.standard = { $in: req.user.standards };
  } else {
    filter.teacherId = req.user._id;
  }

  const students = await Student.find(filter)
    .select('_id name admissionNumber className needsRevision revisionReason')
    .lean();

  const studentIds = students.map((s) => s._id);

  // Check last 5 days of progress for absence streaks
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  fiveDaysAgo.setHours(0, 0, 0, 0);

  const recentProgress = await Progress.find({
    studentId: { $in: studentIds },
    date: { $gte: fiveDaysAgo },
  })
    .select('studentId isAbsent needsRevision date')
    .sort({ date: -1 })
    .lean();

  // Group by studentId
  const progressByStudent = {};
  recentProgress.forEach((p) => {
    const key = p.studentId.toString();
    if (!progressByStudent[key]) progressByStudent[key] = [];
    progressByStudent[key].push(p);
  });

  const attentionList = [];

  for (const student of students) {
    const key = student._id.toString();
    const records = progressByStudent[key] || [];

    // Frequent absence: 3+ consecutive absent days
    const consecutiveAbsent = records.filter((r) => r.isAbsent).length;
    if (consecutiveAbsent >= 3) {
      attentionList.push({
        id: student._id,
        studentName: student.name,
        rollNumber: student.admissionNumber,
        reason: 'Frequent Absence',
        details: `Absent ${consecutiveAbsent} of the last ${records.length} recorded days`,
        daysCount: consecutiveAbsent,
        severity: consecutiveAbsent >= 3 ? 'high' : 'medium',
      });
      continue;
    }

    // Needs revision flag on student record
    if (student.needsRevision) {
      const revisionDays = records.filter((r) => r.needsRevision).length;
      attentionList.push({
        id: student._id,
        studentName: student.name,
        rollNumber: student.admissionNumber,
        reason: revisionDays >= 2 ? 'Needs Revision Repeat' : 'Stuck on Lesson',
        details: student.revisionReason || 'Flagged for needs revision',
        daysCount: Math.max(revisionDays, 1),
        severity: 'medium',
      });
    }
  }

  res.json({ success: true, data: { attentionList } });
});

// ─── GET /teacher/feedbacks ───────────────────────────────────────────────────

const getFeedbacks = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find({ teacherId: req.user._id })
    .populate('parentId', 'username')
    .populate('studentId', 'name admissionNumber')
    .sort({ date: -1 })
    .limit(100)
    .lean();

  // Shape for the frontend ParentNote interface
  const shaped = feedbacks.map((f) => ({
    id: f._id,
    studentName: f.studentId?.name || 'Unknown',
    parentName: f.parentId?.username || 'Parent',
    date: new Date(f.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    category: 'Academic Query',   // Feedback model doesn't have category — use default
    message: f.message,
    read: f.isRead,
  }));

  res.json({ success: true, data: { feedbacks: shaped } });
});

// ─── PATCH /teacher/feedbacks/:id/read ───────────────────────────────────────

const markFeedbackRead = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findOneAndUpdate(
    { _id: req.params.id, teacherId: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  res.json({ success: true, data: { feedback } });
});

// ─── POST /teacher/flag ───────────────────────────────────────────────────────
// Allows teacher to flag a student issue to Admin / Parent

const flagStudentIssue = asyncHandler(async (req, res) => {
  const { studentId, issueType, recipient, notes: noteText } = req.body;

  // Verify the student belongs to this teacher
  const student = await Student.findOne({
    _id: studentId,
    teacherId: req.user._id,
    isActive: true,
  });

  if (!student) {
    throw new AppError('Student not found or not assigned to you', 404);
  }

  // Update student's needsRevision status when relevant
  if (issueType === 'Academic Struggle') {
    student.needsRevision = true;
    student.revisionReason = noteText?.trim() || issueType;
    await student.save();
  }

  // Create IssueReport
  const report = await IssueReport.create({
    studentId: student._id,
    teacherId: req.user._id,
    issueType,
    recipient,
    notes: noteText?.trim(),
  });

  await logActivity({
    actionType: 'REPORT_SENT',
    message: `${req.user?.username || 'Teacher'} sent a report for ${student.name} (${issueType})`,
    performedById: req.user?._id,
  });

  res.json({
    success: true,
    data: {
      message: `Issue flagged to ${recipient} successfully`,
      studentId: student._id,
      issueType,
      recipient,
      reportId: report._id,
    },
  });
});

// ─── GET /teacher/reports/progress ────────────────────────────────────────────

const getProgressReports = asyncHandler(async (req, res) => {
  // Find all assigned students
  const students = await Student.find({
    teacherId: req.user._id,
    isActive: true,
  }).select('_id').lean();
  
  const studentIds = students.map((s) => s._id);

  if (studentIds.length === 0) {
    return res.json({ success: true, data: { recentProgress: [], archivedSummaries: [] } });
  }

  // 1. Fetch recent daily progress
  const recentProgress = await Progress.find({ studentId: { $in: studentIds } })
    .populate('studentId', 'name admissionNumber className')
    .sort({ date: -1 })
    .lean();

  // 2. Fetch archived monthly summaries
  const archivedSummaries = await MonthlySummary.find({ studentId: { $in: studentIds } })
    .populate('studentId', 'name admissionNumber className')
    .sort({ year: -1, month: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      recentProgress,
      archivedSummaries,
    }
  });
});

// ─── DELETE /teacher/needs-attention/:id ─────────────────────────────────────

const deleteNeedsAttention = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Permanently update/clear Student needsRevision flag (strictly verify ownership)
  const student = await Student.findOne({ _id: id, teacherId: req.user._id });
  if (!student) {
    throw new AppError('Student not found or not assigned to you', 404);
  }

  student.needsRevision = false;
  student.revisionReason = '';
  await student.save();

  // 2. Permanently delete any associated flagged Progress records for this student owned by this teacher
  await Progress.deleteMany({ studentId: id, teacherId: req.user._id, needsRevision: true });

  res.json({
    success: true,
    message: 'Attention report permanently deleted',
    data: { id },
  });
});

// ─── GET /teacher/announcements ──────────────────────────────────────────────

const getTeacherAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({
    $or: [
      { teacherId: req.user._id },
      { teacherId: null },
      { teacherId: { $exists: false } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({
    success: true,
    data: {
      announcements: announcements.map((a) => ({
        id: a._id,
        title: a.title || 'Admin Announcement',
        message: a.message,
        date: a.date || a.createdAt,
        targetClass: a.teacherId ? 'Targeted Notice' : 'All Classes',
      })),
    },
  });
});

module.exports = {
  getAssignedStudents,
  getTeacherSubmissionStatus,
  submitProgress,
  getClassSummary,
  getNeedsAttention,
  deleteNeedsAttention,
  getTeacherAnnouncements,
  getFeedbacks,
  markFeedbackRead,
  flagStudentIssue,
  getProgressReports,
};
