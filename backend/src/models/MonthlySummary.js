const mongoose = require('mongoose');

const monthlySummarySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1, // 1 for Jan, 12 for Dec based on MongoDB $month
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    totalNewLinesLearned: {
      type: Number,
      default: 0,
    },
    totalJuzuPadam: {
      type: Number,
      default: 0,
    },
    totalRevisions: {
      type: Number,
      default: 0,
    },
    daysAbsent: {
      type: Number,
      default: 0,
    },
    daysNeedsRevision: {
      type: Number,
      default: 0,
    },
    maxJuzuReached: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Enforce strict compound unique index
monthlySummarySchema.index({ studentId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('MonthlySummary', monthlySummarySchema);
