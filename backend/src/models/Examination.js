const mongoose = require('mongoose');

const examinationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Examination title is required'],
      trim: true,
      maxlength: 150,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    standards: {
      type: [String],
      required: [true, 'At least one class or standard must be selected'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one class or standard must be selected',
      },
    },
    passingMarks: {
      type: Number,
      default: 35,
      min: 0,
    },
    totalMarks: {
      type: Number,
      default: 100,
      min: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Ongoing', 'Completed'],
      default: 'Scheduled',
    },
  },
  { timestamps: true }
);

examinationSchema.index({ startDate: 1, status: 1 });
examinationSchema.index({ standards: 1 });

module.exports = mongoose.model('Examination', examinationSchema);
