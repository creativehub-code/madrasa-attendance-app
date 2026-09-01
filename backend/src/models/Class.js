const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

classSchema.virtual('students', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'classId',
});

classSchema.virtual('teacher', {
  ref: 'User',
  localField: '_id',
  foreignField: 'assignedClass',
  justOne: true,
});

module.exports = mongoose.model('Class', classSchema);

