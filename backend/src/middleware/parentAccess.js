const mongoose = require('mongoose');
const { Student, IssueReport } = require('../models');
const { AppError, asyncHandler } = require('../utils/asyncHandler');

/**
 * assertParentOwnsReport
 *
 * Middleware guard for PATCH /parent/reports/:id/read
 *
 * Verifies:
 *  1. The report exists and is visible to parents (recipient is 'Parent' or 'Both').
 *  2. The report's studentId belongs to one of the requesting parent's children.
 *
 * This is a defence-in-depth layer on top of the controller's own checks.
 * It ensures no parent can mark another parent's report as read, even if the
 * controller is accidentally refactored to remove its own ownership check.
 *
 * On success, attaches `req.report` so the controller can avoid a second DB lookup.
 */
const assertParentOwnsReport = asyncHandler(async (req, _res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid report ID', 400);
  }

  const report = await IssueReport.findById(id).lean();

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  // Guard: this route is only for parent-visible reports
  if (report.recipient !== 'Parent' && report.recipient !== 'Both') {
    throw new AppError('Not authorized to access this report', 403);
  }

  // Ownership check: the report's student must be one of this parent's children
  const student = await Student.findOne(
    { _id: report.studentId, parentId: req.user._id, isActive: true },
    '_id'
  ).lean();

  if (!student) {
    throw new AppError('Not authorized to access this report', 403);
  }

  // Attach report to request so controller can skip the redundant findById
  req.report = report;
  next();
});

module.exports = { assertParentOwnsReport };
