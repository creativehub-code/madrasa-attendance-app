const mongoose = require('mongoose');

const examMarkSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: [true, 'Exam ID is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher ID is required'],
    },
    standard: {
      type: String,
      required: [true, 'Standard/Class is required'],
      trim: true,
    },
    marks: {
      type: Number,
      required: [true, 'Marks score is required'],
      min: 0,
    },
    maxMarks: {
      type: Number,
      default: 100,
    },
    subject: {
      type: String,
      default: 'General',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

examMarkSchema.index({ examId: 1, studentId: 1 }, { unique: true });
examMarkSchema.index({ teacherId: 1, standard: 1 });

module.exports = mongoose.model('ExamMark', examMarkSchema);
