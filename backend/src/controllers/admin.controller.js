const mongoose = require('mongoose');
const { User, Student, Announcement, Progress, Counter, ActivityLog, IssueReport, Class } = require('../models');
const { AppError, asyncHandler } = require('../utils/asyncHandler');
const { logActivity } = require('../utils/logger');
// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── POST /admin/users ────────────────────────────────────────────────────────

const createUser = asyncHandler(async (req, res) => {
  const { username, password, role } = req.body;

  const existing = await User.findOne({ username: username.toLowerCase().trim() });
  if (existing) {
    throw new AppError('Username already taken', 409);
  }

  // Password is hashed automatically by the User pre-save hook (bcrypt, cost 12)
  const user = await User.create({ username, password, role });

  res.status(201).json({
    success: true,
    data: { user },
  });
});

// ─── POST /admin/students/bulk ────────────────────────────────────────────────

const bulkCreateStudents = asyncHandler(async (req, res) => {
  const { students } = req.body;

  const teacherIds = [...new Set(students.map((s) => s.teacherId))];
  const parentIds = [...new Set(students.map((s) => s.parentId))];

  const [teachers, parents] = await Promise.all([
    User.find({ _id: { $in: teacherIds }, role: 'Teacher', isActive: true }),
    User.find({ _id: { $in: parentIds }, role: 'Parent', isActive: true }),
  ]);

  if (teachers.length !== teacherIds.length) {
    throw new AppError('One or more teacherId values are invalid', 400);
  }

  if (parents.length !== parentIds.length) {
    throw new AppError('One or more parentId values are invalid', 400);
  }

  const created = await Student.insertMany(
    students.map((s) => ({
      name: s.name,
      admissionNumber: s.admissionNumber.toUpperCase(),
      standard: s.standard || '1st Standard',
      teacherId: s.teacherId,
      parentId: s.parentId,
    })),
    { ordered: false }
  ).catch((err) => {
    if (err.code === 11000) {
      throw new AppError('Duplicate admission number in upload', 409);
    }
    throw err;
  });

  await logActivity({
    actionType: 'STUDENT_CREATED',
    message: `Admin bulk created ${created.length} students`,
    performedById: req.user?._id,
  });

  res.status(201).json({
    success: true,
    data: { count: created.length, students: created },
  });
});

// ─── POST /admin/announcements ────────────────────────────────────────────────

const createAnnouncement = asyncHandler(async (req, res) => {
  const { message, subject, date } = req.body;

  const content = message || subject;
  if (!content || !content.trim()) {
    throw new AppError('Announcement message or subject is required', 400);
  }

  const announcement = await Announcement.create({
    message: content.trim(),
    date: date || new Date(),
    createdBy: req.user._id,
  });

  await logActivity({
    actionType: 'ANNOUNCEMENT_CREATED',
    message: `Admin broadcasted announcement: "${content.trim()}"`,
    performedById: req.user?._id,
  });

  res.status(201).json({
    success: true,
    data: { announcement },
  });
});

// ─── POST /admin/students/create ──────────────────────────────────────────────
// Single-step form: atomically creates Parent User + Counter increment + Student
// Uses a MongoDB transaction so any failure rolls back all writes together.

const createStudent = asyncHandler(async (req, res) => {
  const { studentName, standard, teacherId, parentUsername, parentPassword, existingParentId, className, classId, section } = req.body;
  const sanitizedSection = section && typeof section === 'string' ? section.trim().slice(0, 50).replace(/[<>]/g, '') : 'Noorani Qaida';

  console.log('[Admin] createStudent payload:', { studentName, standard, teacherId, parentUsername, existingParentId, className, classId });

  // ── 1. Verify teacher exists (read-only check; no session needed) ──────────
  const teacher = await User.findOne({ _id: teacherId, role: { $in: ['Teacher', 'school_teacher'] }, isActive: true });
  if (!teacher) {
    throw new AppError('Selected teacher not found or is inactive', 404);
  }

  // ── 2. Start MongoDB transaction session ───────────────────────────────────
  const session = await mongoose.startSession();

  let parentUser;
  let student;

  try {
    await session.withTransaction(async () => {
      if (existingParentId) {
        // ── 3A. Select Existing Parent Account ────────────────────────────────
        const parent = await User.findOne(
          { _id: existingParentId, role: 'Parent', isActive: true },
          null,
          { session }
        );
        if (!parent) {
          throw new AppError('Selected existing parent account was not found or is inactive', 404);
        }
        parentUser = parent;
      } else {
        // ── 3B. Create New Parent Account ──────────────────────────────────────
        if (!parentUsername || !parentPassword) {
          throw new AppError('Parent username and password are required when creating a new parent', 400);
        }

        const existingParent = await User.findOne(
          { username: parentUsername.toLowerCase().trim() },
          null,
          { session }
        );
        if (existingParent) {
          throw new AppError(
            `Username "${parentUsername}" is already taken. Choose a different parent username or select Existing Parent.`,
            409
          );
        }

        const [created] = await User.create(
          [
            {
              username: parentUsername.trim(),
              password: parentPassword,
              role: 'Parent',
              mustChangePassword: true,
            },
          ],
          { session }
        );
        parentUser = created;
      }

      // ── 4. Get next sequential admission number from Counter ───────────────
      const seq = await Counter.nextSequence('student', session);
      const admissionNumber = `STU-${seq}`; // e.g. STU-1001, STU-1002 …

      // ── 5. Create Student ─────────────────────────────────────────────────
      const [createdStudent] = await Student.create(
        [
          {
            name: studentName.trim(),
            admissionNumber,
            standard: standard ? standard.trim() : '1st Standard',
            teacherId,
            parentId: parentUser._id,
            className: className ? className.trim() : '',
            classId: classId || null,
            section: sanitizedSection || 'Noorani Qaida',
          },
        ],
        { session }
      );
      student = createdStudent;
    });

    // Transaction committed — session can be ended
    console.log('[Admin] createStudent — committed:', {
      studentId: student._id,
      parentId: parentUser._id,
      admissionNumber: student.admissionNumber,
    });

    await logActivity({
      actionType: 'STUDENT_CREATED',
      message: `Admin created a new student: ${studentName.trim()}`,
      performedById: req.user?._id,
    });
  } catch (err) {
    // session.withTransaction automatically calls abortTransaction() on error.
    // Log and re-throw so the global error handler formats the response.
    console.error('[Admin] createStudent — transaction aborted:', err.message);
    throw err;
  } finally {
    session.endSession();
  }

  res.status(201).json({
    success: true,
    data: {
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.admissionNumber,
        standard: student.standard,
        teacherUsername: teacher.username,
        parentUsername: parentUser.username,
      },
      parent: { _id: parentUser._id, username: parentUser.username },
      message: `Student "${studentName}" created. Roll number: ${student.admissionNumber}. Parent login: ${parentUser.username}`,
    },
  });
});

// ─── POST /admin/teachers/create ──────────────────────────────────────────────
// Creates a new Teacher user account.
// Password is hashed by the User.js pre-save bcrypt hook — no manual hashing here.

const createTeacher = asyncHandler(async (req, res) => {
  const { username, password, fullName, role, standards, assignedClass, assignedClassName } = req.body;

  const loginUsername = username.toLowerCase().trim();
  const assignedRole = role || 'Teacher';

  console.log('[Admin] createTeacher payload:', { loginUsername, fullName, role: assignedRole, standards, assignedClass });

  const existing = await User.findOne({ username: loginUsername });
  if (existing) {
    throw new AppError(`Username "${loginUsername}" is already taken`, 409);
  }

  // Validate assignedClass if provided for Madrasa Teachers
  if (assignedRole === 'Teacher' && assignedClass) {
    const classDoc = await Class.findById(assignedClass);
    if (!classDoc) {
      throw new AppError('Selected class not found', 404);
    }
  }

  // User.create triggers the pre-save hook which runs bcrypt.hash(password, 12)
  const teacher = await User.create({
    username: loginUsername,
    password,
    role: assignedRole,
    mustChangePassword: true,
    standards: assignedRole === 'school_teacher' ? (standards || []) : [],
    assignedClass: assignedRole === 'Teacher' ? (assignedClass || null) : null,
    assignedClassName: assignedRole === 'Teacher' ? (assignedClassName || '') : '',
  });

  // Cascade/Bulk update: if a class is assigned to this teacher, update all students of that class
  if (assignedRole === 'Teacher' && assignedClass) {
    await Student.updateMany(
      { classId: assignedClass },
      { $set: { teacherId: teacher._id } }
    );
  }

  console.log('[Admin] createTeacher — success:', { teacherId: teacher._id, username: teacher.username, role: teacher.role });

  await logActivity({
    actionType: 'TEACHER_CREATED',
    message: `Admin created ${assignedRole === 'school_teacher' ? 'School Teacher' : 'Teacher'} account: ${teacher.username}`,
    performedById: req.user?._id,
  });

  res.status(201).json({
    success: true,
    data: {
      teacher: {
        _id: teacher._id,
        username: teacher.username,
        role: teacher.role,
        mustChangePassword: teacher.mustChangePassword,
        standards: teacher.standards,
        assignedClassName: teacher.assignedClassName,
      },
      message: `${assignedRole === 'school_teacher' ? 'School Teacher' : 'Teacher'} account "${teacher.username}" created successfully`,
    },
  });
});

// ─── GET /admin/stats ─────────────────────────────────────────────────────────

const getStats = asyncHandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // All four queries run concurrently.
  // countDocuments() uses MongoDB's index-backed count — O(1) with a proper
  // compound index on {role, isActive, isDeleted} rather than fetching full documents.
  const [totalStudents, totalTeachers, totalParents, todayProgressRecords] =
    await Promise.all([
      Student.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
      User.countDocuments({ role: { $in: ['Teacher', 'school_teacher'] }, isActive: true, isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'Parent', isActive: true, isDeleted: { $ne: true } }),
      Progress.find({ date: { $gte: todayStart, $lte: todayEnd } }),
    ]);

  const totalAttendeesToday = todayProgressRecords.length;
  const attendanceToday = totalStudents > 0 ? Math.round((totalAttendeesToday / totalStudents) * 100) : 0;

  res.json({
    success: true,
    data: {
      totalStudents,
      totalTeachers,
      totalParents,
      attendanceToday,
    },
  });
});

// ─── GET /admin/students ──────────────────────────────────────────────────────

const getStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search = '', standard = '' } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const filter = { isActive: true };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { admissionNumber: { $regex: search, $options: 'i' } },
    ];
  }
  if (standard) {
    filter.standard = { $regex: standard, $options: 'i' };
  }

  const [students, total] = await Promise.all([
    Student.find(filter)
      .select('name admissionNumber standard section className classId needsRevision isActive status createdAt')
      .populate('classId', 'name')
      .populate('teacherId', 'username')
      .populate('parentId', 'username')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    Student.countDocuments(filter),
  ]);

  const normalized = students.map((s) => {
    const classObjName = s.classId && typeof s.classId === 'object' ? s.classId.name : null;
    const finalClassName = classObjName || s.className || '';
    const finalClassId = s.classId && typeof s.classId === 'object' ? s.classId._id : s.classId || null;
    const finalTeacherId = s.teacherId && typeof s.teacherId === 'object' ? s.teacherId._id : s.teacherId || null;
    const finalParentId = s.parentId && typeof s.parentId === 'object' ? s.parentId._id : s.parentId || null;

    return {
      _id: s._id,
      name: s.name,
      rollNumber: s.admissionNumber,
      standard: s.standard,
      section: s.section || 'Noorani Qaida',
      className: finalClassName,
      classId: finalClassId,
      class: classObjName ? { _id: s.classId._id, name: s.classId.name } : null,
      teacherId: finalTeacherId,
      parentId: finalParentId,
      needsRevision: s.needsRevision,
      isActive: s.isActive,
      status: s.status,
      teacherUsername: s.teacherId?.username || '—',
      parentUsername: s.parentId?.username || '—',
    };
  });

  res.json({
    success: true,
    data: { students: normalized, total, page: parseInt(page, 10) },
  });
});

// ─── PATCH /admin/students/:id ────────────────────────────────────────────────
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, standard, teacherId, status, classId, className, section } = req.body;

  const student = await Student.findById(id);
  if (!student) throw new AppError('Student not found', 404);

  if (name) student.name = name;
  if (standard) student.standard = standard;
  if (section !== undefined && typeof section === 'string') {
    const cleanSec = section.trim().slice(0, 50).replace(/[<>]/g, '');
    if (cleanSec) student.section = cleanSec;
  }
  if (status && ['Active', 'Discontinued'].includes(status)) {
    student.status = status;
  }
  if (teacherId !== undefined && teacherId !== '') {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      throw new AppError('Invalid teacherId format', 400);
    }
    const teacher = await User.findOne({ _id: teacherId, role: { $in: ['Teacher', 'school_teacher'] }, isActive: true });
    if (!teacher) throw new AppError('Selected teacher not found or is inactive', 404);
    student.teacherId = teacher._id;
  }

  if (classId !== undefined) {
    if (classId === null || classId === '') {
      student.classId = null;
      student.className = '';
    } else {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new AppError('Invalid classId format', 400);
      }
      const classObj = await Class.findById(classId);
      if (!classObj) throw new AppError('Selected class not found', 404);
      student.classId = classObj._id;
      student.className = classObj.name;
    }
  } else if (className !== undefined) {
    student.className = className ? className.trim() : '';
  }

  await student.save();

  res.json({
    success: true,
    data: { message: 'Student updated successfully', student },
  });
});

// ─── DELETE /admin/students/:id ───────────────────────────────────────────────
const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const student = await Student.findById(id);
  if (!student || !student.isActive || student.isDeleted) {
    throw new AppError('Student not found', 404);
  }

  // 1. Soft delete the target student
  student.isActive = false;
  student.isDeleted = true;
  student.status = 'Discontinued';
  await student.save();

  let parentDeleted = false;

  // 2. Check if parent exists and has any remaining active students
  if (student.parentId) {
    const remainingActiveStudents = await Student.countDocuments({
      parentId: student.parentId,
      _id: { $ne: student._id },
      isActive: true,
      isDeleted: { $ne: true },
    });

    // 3. Cascade delete parent only if NO other active students exist
    if (remainingActiveStudents === 0) {
      await User.findByIdAndUpdate(student.parentId, {
        isActive: false,
        isDeleted: true,
      });
      parentDeleted = true;
    }
  }

  await logActivity({
    actionType: 'STUDENT_DELETED',
    message: `Admin soft deleted student: ${student.name} (${student.admissionNumber})${
      parentDeleted ? ' and associated parent account' : ''
    }`,
    performedById: req.user?._id,
  });

  res.json({
    success: true,
    data: {
      message: 'Student deleted successfully',
      parentDeleted,
    },
  });
});

// ─── GET /admin/students/:id/progress-summary ─────────────────────────────────
const getStudentProgressSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findById(id).lean();
  if (!student) throw new AppError('Student not found', 404);

  const totalProgress = await Progress.countDocuments({ studentId: id });
  const latestProgress = await Progress.findOne({ studentId: id })
    .sort({ date: -1 })
    .lean();

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const totals = await Progress.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(id) } },
    {
      $group: {
        _id: '$studentId',
        recentPuthiyaPadamLines: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$unit', 'lines'] },
                  { $gte: ['$date', windowStart] },
                ],
              },
              '$puthiyaPadam',
              0,
            ],
          },
        },
        historicalPuthiyaPadamPages: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$unit', 'lines'] },
                  { $lt: ['$date', windowStart] },
                ],
              },
              '$puthiyaPadam',
              0,
            ],
          },
        },
        totalPazhayaPadam: { $sum: '$pazhayaPadam' },
        totalJuzuPadam: { $sum: '$juzuPadam' },
      },
    },
  ]);

  const totalStats = totals[0] || {
    recentPuthiyaPadamLines: 0,
    historicalPuthiyaPadamPages: 0,
    totalPazhayaPadam: 0,
    totalJuzuPadam: 0,
  };

  const recentActivity = await Progress.find({ studentId: id })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  res.json({
    success: true,
    data: {
      totalLessonsAssigned: totalProgress,
      currentJuzu: latestProgress?.juzuNumber || student.currentJuzu || 1,
      recentPuthiyaPadamLines: totalStats.recentPuthiyaPadamLines || 0,
      historicalPuthiyaPadamPages: totalStats.historicalPuthiyaPadamPages || 0,
      totalPuthiyaPadam: (totalStats.recentPuthiyaPadamLines || 0) + (totalStats.historicalPuthiyaPadamPages || 0),
      totalPazhayaPadam: totalStats.totalPazhayaPadam || 0,
      totalJuzuPadam: totalStats.totalJuzuPadam || 0,
      latestProgressDate: latestProgress?.date || null,
      recentActivity,
    },
  });
});

// ─── GET /admin/teachers ──────────────────────────────────────────────────────

const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: { $in: ['Teacher', 'school_teacher'] } })
    .select('username role createdAt standards assignedClass assignedClassName status isActive')
    .populate('assignedClass', 'name')
    .lean();

  const { start: todayStart, end: todayEnd } = getISTDateBounds();

  // Calculate role-specific student counts:
  // 1. School Teachers: Count active students whose standard is in the teacher's standards array.
  // 2. Madrasa Teachers: Count active students assigned to teacherId or matching assignedClass.
  const studentCountPromises = teachers.map(async (t) => {
    let filter = { isActive: true, isDeleted: { $ne: true } };

    if (t.role === 'school_teacher') {
      if (t.standards && t.standards.length > 0) {
        filter.standard = { $in: t.standards };
      } else {
        filter.teacherId = t._id;
      }
    } else {
      if (t.assignedClass) {
        filter.$or = [{ teacherId: t._id }, { classId: t.assignedClass }];
      } else {
        filter.teacherId = t._id;
      }
    }

    return Student.countDocuments(filter);
  });

  const studentCounts = await Promise.all(studentCountPromises);

  // Check today's progress submissions
  const todayProgresses = await Progress.aggregate([
    { $match: { date: { $gte: todayStart, $lte: todayEnd }, isLocked: true } },
    {
      $lookup: {
        from: 'students',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    { $group: { _id: '$student.teacherId', count: { $sum: 1 } } },
  ]);

  const submittedTeacherIds = new Set(
    todayProgresses.map((p) => (p._id ? p._id.toString() : null)).filter(Boolean)
  );

  const result = teachers.map((t, index) => {
    // Resolve assigned class name from populated ref or fallback field
    const populatedClassName = t.assignedClass && typeof t.assignedClass === 'object'
      ? t.assignedClass.name
      : null;

    return {
      _id: t._id,
      name: t.username,
      username: t.username,
      role: t.role,
      studentCount: studentCounts[index] || 0,
      // School Teachers: standards from User document
      standards: t.role === 'school_teacher' ? (t.standards || []) : [],
      // Madrasa Teachers: class name from User document
      assignedClassName: t.role === 'Teacher'
        ? (populatedClassName || t.assignedClassName || '')
        : '',
      status: t.status || 'Active',
      isActive: t.isActive,
      isSubmittedToday: submittedTeacherIds.has(t._id.toString()),
    };
  });

  res.json({ success: true, data: { teachers: result } });
});

// ─── GET /admin/recent-activities ───────────────────────────────────────────

const getRecentActivities = asyncHandler(async (req, res) => {
  const { role } = req.query;
  let filter = {};
  if (role === 'teacher' || role === 'teachers') {
    const teacherUsers = await User.find({ role: { $in: ['Teacher', 'school_teacher'] } }).select('_id').lean();
    const teacherIds = teacherUsers.map((u) => u._id);
    filter = { performedBy: { $in: teacherIds } };
  }

  const activities = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('performedBy', 'username role')
    .lean();

  res.json({
    success: true,
    data: { activities },
  });
});

// ─── PATCH /admin/teacher-progress/:teacherId/unlock ─────────────────────────────

const unlockTeacherProgress = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  const teacher = await User.findOne({ _id: teacherId, role: { $in: ['Teacher', 'school_teacher'] } });
  if (!teacher) {
    throw new AppError('Teacher account not found', 404);
  }

  const { start: todayStart, end: todayEnd } = getISTDateBounds();

  const students = await Student.find({ teacherId }).select('_id').lean();
  const studentIds = students.map((s) => s._id);

  const updateResult = await Progress.updateMany(
    {
      studentId: { $in: studentIds },
      date: { $gte: todayStart, $lte: todayEnd },
    },
    { $set: { isLocked: false } }
  );

  await logActivity({
    actionType: 'ADMIN_UNLOCK',
    message: `Admin unlocked daily submission for teacher: ${teacher.username}`,
    performedById: req.user?._id,
  });

  res.json({
    success: true,
    message: `Daily submission unlocked for teacher "${teacher.username}". Unlocked ${updateResult.modifiedCount} progress records for today.`,
  });
});

// ─── GET /admin/reports ────────────────────────────────────────────────────────

const getIssueReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = { recipient: { $in: ['Admin', 'Both'] } };

  const [reports, totalReports] = await Promise.all([
    IssueReport.find(filter)
      .populate('studentId', 'name admissionNumber className')
      .populate('teacherId', 'username role')
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
        totalPages: Math.ceil(totalReports / limit) || 1,
        totalReports,
      },
    },
  });
});

// ─── PATCH /admin/reports/:id/read ──────────────────────────────────────────────

const markReportAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await IssueReport.findById(id);

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  report.isReadByAdmin = true;
  await report.save();

  res.json({ success: true, data: { message: 'Report marked as read' } });
});

// ─── PATCH /admin/reports/:id/action ──────────────────────────────────────────

const updateReportAction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!['Agreed', 'Rejected'].includes(action)) {
    throw new AppError('Action must be either Agreed or Rejected', 400);
  }

  const session = await mongoose.startSession();
  let updatedReport;

  try {
    await session.withTransaction(async () => {
      const report = await IssueReport.findById(id).session(session).populate('studentId', 'name');
      if (!report) {
        throw new AppError('Report not found', 404);
      }

      report.status = action;
      report.isReadByAdmin = true;
      await report.save({ session });
      updatedReport = report;

      const studentName = report.studentId?.name || 'Student';
      const issueType = report.issueType || 'Issue Report';
      const notificationTitle = `Report ${action}`;
      const notificationMessage = `Your report regarding '${issueType} - ${studentName}' has been ${action} by the Admin.`;

      await Announcement.create(
        [
          {
            title: notificationTitle,
            message: notificationMessage,
            targetAudience: 'Teacher',
            teacherId: report.teacherId,
            createdBy: req.user?._id,
          },
        ],
        { session }
      );

      await logActivity({
        actionType: `REPORT_${action.toUpperCase()}`,
        message: `Admin marked teacher report as ${action} (${studentName})`,
        performedById: req.user?._id,
      });
    });

    res.json({
      success: true,
      message: `Report marked as ${action} successfully`,
      data: { report: updatedReport },
    });
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
});

// ─── DELETE /admin/reports/:id ─────────────────────────────────────────────────

const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await IssueReport.findByIdAndDelete(id);

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  await logActivity({
    actionType: 'REPORT_DELETED',
    message: `Admin deleted issue report ID: ${id}`,
    performedById: req.user?._id,
  });

  res.json({
    success: true,
    message: 'Report deleted successfully',
  });
});

// ─── GET /admin/sections ──────────────────────────────────────────────────────

const getSections = asyncHandler(async (req, res) => {
  const customSections = await Student.distinct('section', { isActive: true });
  const defaultSections = ['Noorani Qaida', 'Hifz', 'Daura'];
  const cleanCustom = customSections
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim().slice(0, 50).replace(/[<>]/g, ''));
  const allSections = Array.from(new Set([...defaultSections, ...cleanCustom])).sort();

  res.json({
    success: true,
    data: { sections: allSections },
  });
});

// ─── GET /admin/parents ───────────────────────────────────────────────────────

const getParents = asyncHandler(async (_req, res) => {
  const parents = await User.find({ role: 'Parent', isActive: true })
    .select('_id username name')
    .sort({ username: 1 })
    .lean();

  res.json({
    success: true,
    data: {
      parents: parents.map((p) => ({
        id: p._id,
        username: p.username,
        name: p.name || p.username,
      })),
    },
  });
});

// ─── PATCH /admin/teachers/:id/terminate ──────────────────────────────────────
// Soft-delete: sets teacher status to 'Terminated' and isActive to false

const terminateTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const teacher = await User.findOne({ _id: id, role: { $in: ['Teacher', 'school_teacher'] } });
  if (!teacher) throw new AppError('Teacher not found', 404);

  teacher.status = 'Terminated';
  teacher.isActive = false;
  await teacher.save();

  await logActivity({
    actionType: 'TEACHER_TERMINATED',
    message: `Admin terminated teacher account: ${teacher.username}`,
    performedById: req.user?._id,
  });

  res.json({
    success: true,
    data: { message: `Teacher "${teacher.username}" has been terminated.` },
  });
});

// ─── DELETE /admin/teachers/:id ───────────────────────────────────────────────
// Hard-delete: permanently removes teacher, reassigns students to admin

const deleteTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const teacher = await User.findOne({ _id: id, role: { $in: ['Teacher', 'school_teacher'] } });
  if (!teacher) throw new AppError('Teacher not found', 404);

  // Reassign all students to the admin (temporary holder)
  const reassigned = await Student.updateMany(
    { teacherId: id },
    { $set: { teacherId: req.user._id } }
  );

  await User.deleteOne({ _id: id });

  await logActivity({
    actionType: 'TEACHER_DELETED',
    message: `Admin permanently deleted teacher: ${teacher.username}. ${reassigned.modifiedCount} student(s) reassigned.`,
    performedById: req.user?._id,
  });

  res.json({
    success: true,
    data: {
      message: `Teacher "${teacher.username}" permanently deleted. ${reassigned.modifiedCount} student(s) reassigned to admin.`,
    },
  });
});

// ─── GET /admin/teachers/:id/students ─────────────────────────────────────────
// Fetch students for a specific teacher (used by the TeacherDetailsModal)

const getTeacherStudents = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const teacher = await User.findOne({ _id: id, role: { $in: ['Teacher', 'school_teacher'] } })
    .select('username role standards assignedClass assignedClassName status isActive')
    .populate('assignedClass', 'name')
    .lean();

  if (!teacher) throw new AppError('Teacher not found', 404);

  // Build filter: school teachers scoped by standards, madrasa teachers by teacherId or assignedClass
  const filter = { isActive: true, isDeleted: { $ne: true } };
  if (teacher.role === 'school_teacher' && teacher.standards?.length > 0) {
    filter.standard = { $in: teacher.standards };
  } else {
    if (teacher.assignedClass) {
      const clsId = typeof teacher.assignedClass === 'object' ? teacher.assignedClass._id : teacher.assignedClass;
      filter.$or = [{ teacherId: id }, { classId: clsId }];
    } else {
      filter.teacherId = id;
    }
  }

  const students = await Student.find(filter)
    .select('name admissionNumber standard section className status')
    .populate('parentId', 'username')
    .sort({ name: 1 })
    .lean();

  const populatedClassName = teacher.assignedClass && typeof teacher.assignedClass === 'object'
    ? teacher.assignedClass.name
    : null;

  res.json({
    success: true,
    data: {
      teacher: {
        _id: teacher._id,
        name: teacher.username,
        role: teacher.role,
        standards: teacher.standards || [],
        assignedClassName: populatedClassName || teacher.assignedClassName || '',
        status: teacher.status || 'Active',
        isActive: teacher.isActive,
      },
      students: students.map((s) => ({
        _id: s._id,
        name: s.name,
        rollNumber: s.admissionNumber,
        standard: s.standard,
        section: s.section || '',
        className: s.className || '',
        status: s.status || 'Active',
        parentUsername: s.parentId?.username || '—',
      })),
    },
  });
});

// ─── PUT /admin/teachers/:id ──────────────────────────────────────────────────
// Safely updates a teacher's assignedClass, assignedClassName, standards, or status.
// Only modifies the target teacher document — multiple teachers can share the same Class/Standard.

const updateTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { standards, assignedClass, assignedClassName, status } = req.body;

  const teacher = await User.findOne({ _id: id, role: { $in: ['Teacher', 'school_teacher'] } });
  if (!teacher) throw new AppError('Teacher account not found', 404);

  if (teacher.role === 'school_teacher') {
    if (standards !== undefined) {
      teacher.standards = Array.isArray(standards) ? standards : [];
    }
  } else if (teacher.role === 'Teacher') {
    if (assignedClass !== undefined) {
      if (assignedClass === null || assignedClass === '') {
        teacher.assignedClass = null;
        teacher.assignedClassName = '';
        // Disassociate any students currently linked to this teacher
        await Student.updateMany(
          { teacherId: teacher._id },
          { $set: { teacherId: null } }
        );
      } else {
        if (!mongoose.Types.ObjectId.isValid(assignedClass)) {
          throw new AppError('Invalid class ID format', 400);
        }
        const classObj = await Class.findById(assignedClass);
        if (!classObj) throw new AppError('Selected class not found', 404);
        teacher.assignedClass = classObj._id;
        teacher.assignedClassName = classObj.name;

        // Cleanup: disassociate students of previous class(es) who do NOT belong to the new classObj._id
        await Student.updateMany(
          { teacherId: teacher._id, classId: { $ne: classObj._id } },
          { $set: { teacherId: null } }
        );

        // Cascade/Bulk update: link all students belonging to the new class to this teacher
        await Student.updateMany(
          { classId: classObj._id },
          { $set: { teacherId: teacher._id } }
        );
      }
    } else if (assignedClassName !== undefined) {
      teacher.assignedClassName = assignedClassName ? assignedClassName.trim() : '';
    }
  }

  if (status && ['Active', 'Terminated'].includes(status)) {
    teacher.status = status;
    if (status === 'Terminated') {
      teacher.isActive = false;
    } else if (status === 'Active') {
      teacher.isActive = true;
    }
  }

  await teacher.save();

  await logActivity({
    actionType: 'TEACHER_UPDATED',
    message: `Admin updated teacher assignment for ${teacher.username}`,
    performedById: req.user?._id,
  });

  const populatedTeacher = await User.findById(teacher._id)
    .select('username role createdAt standards assignedClass assignedClassName status isActive')
    .populate('assignedClass', 'name')
    .lean();

  const populatedClassName = populatedTeacher.assignedClass && typeof populatedTeacher.assignedClass === 'object'
    ? populatedTeacher.assignedClass.name
    : null;

  res.json({
    success: true,
    data: {
      message: `Teacher "${teacher.username}" updated successfully.`,
      teacher: {
        _id: populatedTeacher._id,
        name: populatedTeacher.username,
        role: populatedTeacher.role,
        standards: populatedTeacher.role === 'school_teacher' ? (populatedTeacher.standards || []) : [],
        assignedClassName: populatedTeacher.role === 'Teacher'
          ? (populatedClassName || populatedTeacher.assignedClassName || '')
          : '',
        status: populatedTeacher.status || 'Active',
        isActive: populatedTeacher.isActive,
      },
    },
  });
});

module.exports = {
  createUser,
  bulkCreateStudents,
  createAnnouncement,
  createStudent,
  createTeacher,
  getParents,
  getStats,
  getStudents,
  updateStudent,
  deleteStudent,
  getStudentProgressSummary,
  getTeachers,
  getRecentActivities,
  unlockTeacherProgress,
  getIssueReports,
  markReportAsRead,
  updateReportAction,
  deleteReport,
  getSections,
  terminateTeacher,
  deleteTeacher,
  getTeacherStudents,
  updateTeacher,
};

