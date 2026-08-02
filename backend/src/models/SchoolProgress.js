const mongoose = require('mongoose');

const schoolProgressSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      default: '2025-2026',
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    unitTaught: {
      type: String,
      required: [true, 'Unit taught is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    absentStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
  },
  { timestamps: true }
);

schoolProgressSchema.index({ className: 1, academicYear: 1, date: 1, subject: 1 });
schoolProgressSchema.index({ date: -1 });

module.exports = mongoose.model('SchoolProgress', schoolProgressSchema);
