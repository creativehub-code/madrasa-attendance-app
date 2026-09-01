const mongoose = require('mongoose');

const STANDARDS = [
  '1st Standard',
  '2nd Standard',
  '3rd Standard',
  '4th Standard',
  '5th Standard',
  '6th Standard',
  '7th Standard',
  '8th Standard',
  '9th Standard',
  '10th Standard',
  'Plus One',
  'Plus Two',
  'Degree',
];

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: 100,
    },
    admissionNumber: {
      type: String,
      required: [true, 'Admission number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    standard: {
      type: String,
      enum: STANDARDS,
      default: '1st Standard',
      trim: true,
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      trim: true,
      default: 'Noorani Qaida',
      maxlength: [50, 'Section name cannot exceed 50 characters'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: false,
    },
    className: {
      type: String,
      trim: true,
      default: '',
    },
    academicYear: {
      type: String,
      default: '2025-2026',
      trim: true,
    },
    needsRevision: {
      type: Boolean,
      default: false,
    },
    revisionReason: {
      type: String,
      default: '',
    },
    currentJuzu: {
      type: Number,
      default: 1,
      min: 1,
      max: 30,
    },
    // MongoDB Migration Query:
    // db.students.updateMany({ currentJuzuNumber: { $exists: true } }, { $rename: { "currentJuzuNumber": "currentJuzu" } })
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['Active', 'Discontinued'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

studentSchema.index({ teacherId: 1, isActive: 1, isDeleted: 1, status: 1 });
studentSchema.index({ parentId: 1, isActive: 1, isDeleted: 1, status: 1 });
studentSchema.index({ standard: 1, isActive: 1, isDeleted: 1, status: 1 });

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
module.exports.STANDARDS = STANDARDS;
