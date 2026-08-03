const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    juzuNumber: {
      type: Number,
      default: 1,
      min: 1,
      max: 100,
    },
    dowraCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      enum: ['Noorani Qaida', 'Dowra', 'Regular'],
      default: 'Regular',
    },
    puthiyaPadam: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      enum: ['lines', 'pages'],
      default: 'lines',
    },
    juzuPadam: {
      type: Number,
      default: 0,
      min: 0,
      max: 30,
    },
    pazhayaPadam: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAbsent: {
      type: Boolean,
      default: false,
    },
    needsRevision: {
      type: Boolean,
      default: false,
    },
    isPuthiyaPadamWrong: {
      type: Boolean,
      default: false,
    },
    isCurrentLessonWrong: {
      type: Boolean,
      default: false,
    },
    isPazhayaPadamWrong: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 500,
    },
    isLocked: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

progressSchema.index({ studentId: 1, date: 1 }, { unique: true });
progressSchema.index({ studentId: 1 });
progressSchema.index({ date: -1 });

module.exports = mongoose.model('Progress', progressSchema);
