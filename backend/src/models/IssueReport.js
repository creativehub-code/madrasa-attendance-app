const mongoose = require('mongoose');

const issueReportSchema = new mongoose.Schema(
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
    issueType: {
      type: String,
      required: true,
      enum: ['Academic Struggle', 'Frequent Absence', 'Behavioral', 'Other'],
    },
    recipient: {
      type: String,
      required: true,
      enum: ['Admin', 'Parent', 'Both'],
    },
    notes: {
      type: String,
    },
    isReadByAdmin: {
      type: Boolean,
      default: false,
    },
    isReadByParent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['Pending', 'Agreed', 'Rejected'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster querying by recipient/admin/parent
issueReportSchema.index({ recipient: 1, isReadByAdmin: 1 });
issueReportSchema.index({ studentId: 1, recipient: 1, isReadByParent: 1 });

// TTL Index: Automatically expire issue reports after 15 days (1,296,000 seconds)
issueReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15 * 24 * 60 * 60 });

module.exports = mongoose.model('IssueReport', issueReportSchema);
