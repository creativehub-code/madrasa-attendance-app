const mongoose = require('mongoose');

/**
 * Counter schema — manages auto-incrementing sequences for any collection.
 *
 * Usage:
 *   const Counter = require('./Counter');
 *   const seq = await Counter.nextSequence('student', session);
 *   // seq → 1001, 1002, 1003 …
 */
const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // e.g. 'student', 'announcement'
      required: true,
    },
    seq: {
      type: Number,
      default: 1000, // First call will produce 1001
    },
  },
  { collection: 'counters' }
);

/**
 * Atomically increment and return the next sequence value.
 * Passing a session ensures the increment participates in a transaction.
 *
 * @param {string} name  - Counter identifier (e.g. 'student')
 * @param {import('mongoose').ClientSession} [session] - Optional MongoDB session
 * @returns {Promise<number>} The next sequence value (e.g. 1001)
 */
counterSchema.statics.nextSequence = async function nextSequence(name, session) {
  const opts = session ? { session } : {};
  const doc = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, ...opts }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
