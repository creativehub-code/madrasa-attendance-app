const mongoose = require('mongoose');
const { Student } = require('../models');
const { AppError, asyncHandler } = require('../utils/asyncHandler');

const assertTeacherOwnsStudent = asyncHandler(async (req, _res, next) => {
  const studentId = req.body.studentId || req.params.studentId;

  if (!studentId) {
    throw new AppError('studentId is required', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new AppError('Invalid studentId', 400);
  }

  const student = await Student.findOne({
    _id: studentId,
    teacherId: req.user._id,
    isActive: true,
  });

  if (!student) {
    throw new AppError('Student not found or not assigned to you', 403);
  }

  req.student = student;
  next();
});

const assertParentOwnsStudent = asyncHandler(async (req, _res, next) => {
  const requestedStudentId = req.query.studentId || req.body.studentId;

  let student;

  if (requestedStudentId) {
    if (!mongoose.Types.ObjectId.isValid(requestedStudentId)) {
      throw new AppError('Invalid studentId', 400);
    }
    student = await Student.findOne({
      _id: requestedStudentId,
      parentId: req.user._id,
      isActive: true,
    });
    if (!student) {
      throw new AppError('Student not found or not linked to your account', 403);
    }
  } else {
    student = await Student.findOne({
      parentId: req.user._id,
      isActive: true,
    });
    if (!student) {
      throw new AppError('No student linked to this parent account', 404);
    }
  }

  req.student = student;
  next();
});

const validateProgressEntriesOwnership = asyncHandler(async (req, _res, next) => {
  const { entries } = req.body;

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new AppError('entries must be a non-empty array', 400);
  }

  const studentIds = [...new Set(entries.map((e) => e.studentId))];

  for (const id of studentIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid studentId: ${id}`, 400);
    }
  }

  const count = await Student.countDocuments({
    _id: { $in: studentIds },
    teacherId: req.user._id,
    isActive: true,
  });

  if (count !== studentIds.length) {
    throw new AppError('One or more students are not assigned to you', 403);
  }

  next();
});

module.exports = {
  assertTeacherOwnsStudent,
  assertParentOwnsStudent,
  validateProgressEntriesOwnership,
};
