const { Class } = require('../models');
const { asyncHandler, AppError } = require('../utils/asyncHandler');

/**
 * @desc   Get all classes
 * @route  GET /api/classes
 * @access Private (Admin / Teacher)
 */
const getClasses = asyncHandler(async (_req, res) => {
  const classes = await Class.find().sort({ name: 1 }).lean();
  res.json({
    success: true,
    data: { classes },
  });
});

/**
 * @desc   Create new class with strict case-insensitive duplicate check
 * @route  POST /api/classes
 * @access Private (Admin / Teacher)
 */
const createClass = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('Class name is required', 400);
  }

  const trimmedName = name.trim();

  // Case-insensitive regex check for exact duplicate class name
  const escapedName = trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const existingClass = await Class.findOne({
    name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
  });

  if (existingClass) {
    throw new AppError(`A class with the name "${trimmedName}" already exists.`, 409);
  }

  const newClass = await Class.create({
    name: trimmedName,
    description: description ? description.trim() : '',
  });

  res.status(201).json({
    success: true,
    data: { class: newClass },
  });
});

module.exports = {
  getClasses,
  createClass,
};
