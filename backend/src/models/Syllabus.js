const mongoose = require('mongoose');

const syllabusSchema = new mongoose.Schema(
  {
    standard: {
      type: String,
      required: [true, 'Standard/Class name is required'],
      unique: true,
      trim: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Syllabus', syllabusSchema);
