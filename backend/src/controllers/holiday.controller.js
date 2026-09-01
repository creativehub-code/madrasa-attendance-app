const { Holiday } = require('../models');
const { AppError, asyncHandler } = require('../utils/asyncHandler');
const { getISTDateBounds, normalizeDate } = require('../utils/dateUtils');

// @desc    Get holidays for a given month/year or active ones
// @route   GET /api/holidays
// @access  Private
const getHolidays = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const filter = {};

  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    filter.$or = [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ];
  } else {
    // Return all future/current holidays by default if no month specified
    const { start: todayStart } = getISTDateBounds();
    filter.endDate = { $gte: todayStart };
  }

  const holidays = await Holiday.find(filter).sort({ startDate: 1 }).lean();

  res.json({
    success: true,
    data: { holidays },
  });
});

// @desc    Create a new holiday
// @route   POST /api/holidays
// @access  Admin, Teacher (class only)
const createHoliday = asyncHandler(async (req, res) => {
  const { title, startDate, endDate, isGlobal, classId } = req.body;

  if (req.user.role !== 'Admin' && isGlobal) {
    throw new AppError('Only Admins can create global holidays', 403);
  }

  let finalClassId = classId;
  if (!isGlobal) {
    if (!finalClassId && req.user.assignedClass) {
      finalClassId = req.user.assignedClass;
    }
    if (!finalClassId) {
      // If still no classId, try to find a class assigned to this teacher
      const Class = require('../models').Class;
      const tClass = await Class.findOne({ teacherId: req.user._id });
      if (tClass) finalClassId = tClass._id;
    }
    if (!finalClassId) {
      throw new AppError('classId is required for class-specific holidays', 400);
    }
  }

  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate || startDate);

  const holiday = await Holiday.create({
    title: title || 'Holiday',
    startDate: normalizedStart,
    endDate: normalizedEnd,
    isGlobal: req.user.role === 'Admin' ? isGlobal : false,
    classId: !isGlobal ? finalClassId : undefined,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: holiday,
  });
});

// @desc    Delete a holiday
// @route   DELETE /api/holidays/:id
// @access  Admin, Teacher (if they created it)
const deleteHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.findById(req.params.id);

  if (!holiday) {
    throw new AppError('Holiday not found', 404);
  }

  if (req.user.role !== 'Admin' && holiday.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to delete this holiday', 403);
  }

  await holiday.deleteOne();

  res.json({
    success: true,
    data: {},
  });
});

module.exports = {
  getHolidays,
  createHoliday,
  deleteHoliday,
};
