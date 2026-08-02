const { ActivityLog } = require('../models');

/**
 * Non-blocking activity logger helper.
 * Safely writes an activity log entry to MongoDB without throwing errors to the caller.
 *
 * @param {Object} params
 * @param {string} params.actionType - Type of action (e.g. 'STUDENT_CREATED', 'ATTENDANCE_MARKED')
 * @param {string} params.message - Human-readable description of the activity
 * @param {string|mongoose.Types.ObjectId} [params.performedById] - ID of user performing the action
 */
async function logActivity({ actionType, message, performedById }) {
  try {
    if (!actionType || !message) return;
    await ActivityLog.create({
      actionType,
      message,
      performedBy: performedById || null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[ActivityLog Error]: Failed to record activity log:', err.message);
  }
}

module.exports = {
  logActivity,
};
