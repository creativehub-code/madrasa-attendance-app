const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      default: 'Holiday',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isGlobal: {
      type: Boolean,
      default: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: function() {
        return !this.isGlobal;
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Holiday', holidaySchema);
