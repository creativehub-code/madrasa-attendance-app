const cron = require('node-cron');
const mongoose = require('mongoose');
const { Progress, MonthlySummary, ActivityLog } = require('../models');

// Extract timezone constants
const TZ = 'Asia/Kolkata';

/**
 * Perform monthly progress aggregation and cleanup
 */
const performMonthlyRollup = async () => {
  console.log('[Rollup Service] Starting automated monthly progress rollup...');
  
  // Calculate Target Threshold
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: TZ });
  const istDate = new Date(istString);
  
  // We want to keep Current Month, and Previous 2 Months.
  // So anything older than the 1st day of (Current Month - 2) is rolled up.
  // Example: if current is Oct (month 9, index 9), threshold is Aug 1st. Anything < Aug 1 is rolled up.
  const currentYear = istDate.getFullYear();
  const currentMonth = istDate.getMonth();
  
  // Date constructor handles negative months smoothly
  const thresholdLocal = new Date(currentYear, currentMonth - 2, 1);
  const thresholdYear = thresholdLocal.getFullYear();
  const thresholdMonth = thresholdLocal.getMonth();
  
  const pad = (n) => String(n).padStart(2, '0');
  const thresholdStr = `${thresholdYear}-${pad(thresholdMonth + 1)}-01T00:00:00.000+05:30`;
  const thresholdDate = new Date(thresholdStr);

  console.log(`[Rollup Service] Threshold Date (IST): ${thresholdDate.toISOString()}`);
  
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // 1. Aggregate older records
      const summaries = await Progress.aggregate([
        { 
          $match: { date: { $lt: thresholdDate } } 
        },
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'studentDoc'
          }
        },
        {
          $group: {
            _id: {
              studentId: '$studentId',
              // Use teacherId from Progress if available, else fallback to Student profile
              teacherId: { $cond: [{ $ifNull: ['$teacherId', false] }, '$teacherId', { $arrayElemAt: ['$studentDoc.teacherId', 0] }] },
              year: { $year: { date: '$date', timezone: '+05:30' } },
              month: { $month: { date: '$date', timezone: '+05:30' } }, // MongoDB month is 1-12
            },
            totalNewLinesLearned: { $sum: '$puthiyaPadam' },
            totalJuzuPadam: { $sum: '$juzuPadam' },
            totalRevisions: { $sum: '$pazhayaPadam' },
            daysAbsent: { $sum: { $cond: ['$isAbsent', 1, 0] } },
            daysNeedsRevision: { $sum: { $cond: ['$needsRevision', 1, 0] } },
            maxJuzuReached: { $max: '$juzuNumber' },
          }
        }
      ], { session });

      if (summaries.length === 0) {
        console.log('[Rollup Service] No older records found to rollup.');
        return;
      }

      console.log(`[Rollup Service] Found ${summaries.length} monthly summaries to generate.`);

      // 2. Prepare bulk upsert operations for MonthlySummary
      const bulkOps = summaries.map((s) => ({
        updateOne: {
          filter: {
            studentId: s._id.studentId,
            month: s._id.month,
            year: s._id.year,
          },
          update: {
            $set: {
              studentId: s._id.studentId,
              teacherId: s._id.teacherId,
              month: s._id.month,
              year: s._id.year,
            },
            $inc: {
              totalNewLinesLearned: s.totalNewLinesLearned,
              totalJuzuPadam: s.totalJuzuPadam,
              totalRevisions: s.totalRevisions,
              daysAbsent: s.daysAbsent,
              daysNeedsRevision: s.daysNeedsRevision,
            },
            $max: {
              maxJuzuReached: s.maxJuzuReached,
            }
          },
          upsert: true,
        },
      }));

      // 3. Execute bulk write
      const writeResult = await MonthlySummary.bulkWrite(bulkOps, { session, ordered: false });
      
      // 4. Delete the aggregated Progress records
      const deleteResult = await Progress.deleteMany({ date: { $lt: thresholdDate } }, { session });

      console.log(`[Rollup Service] Transaction Success: Upserted ${writeResult.upsertedCount + writeResult.modifiedCount} summaries. Deleted ${deleteResult.deletedCount} daily records.`);
      
      // Log it
      await ActivityLog.create([{
        actionType: 'SYSTEM_ROLLUP',
        message: `System successfully aggregated ${deleteResult.deletedCount} daily records into ${summaries.length} monthly summaries.`,
      }], { session });
    });
  } catch (error) {
    console.error('[Rollup Service] Transaction failed, all operations aborted:', error);
  } finally {
    session.endSession();
  }
};

const initRollupService = () => {
  // Run on the 1st of every month at 02:00 AM IST
  cron.schedule('0 2 1 * *', () => {
    performMonthlyRollup();
  }, {
    scheduled: true,
    timezone: TZ
  });
  
  console.log(`[Rollup Service] Cron job initialized (0 2 1 * * ${TZ})`);
};

module.exports = { initRollupService, performMonthlyRollup };
