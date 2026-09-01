const { Class } = require('../models');
const { asyncHandler, AppError } = require('../utils/asyncHandler');

/**
 * @desc   Get all classes
 * @route  GET /api/classes
 * @access Private (Admin / Teacher)
 */
const getClasses = asyncHandler(async (_req, res) => {
  const classes = await Class.find()
    .populate({
      path: 'students',
      match: { isActive: true, isDeleted: { $ne: true } },
      select: 'name admissionNumber standard section currentJuzu status teacherId parentId',
      populate: {
        path: 'teacherId',
        select: 'username fullName',
      },
    })
    .populate({
      path: 'teacher',
      select: 'username fullName',
    })
    .sort({ name: 1 });

  res.json({
    success: true,
    data: { classes },
  });
});

/**
 * @desc   Get single class by ID with populated students and teacher
 * @route  GET /api/classes/:id
 * @access Private (Admin / Teacher)
 */
const getClassById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const classDoc = await Class.findById(id)
    .populate({
      path: 'students',
      match: { isActive: true, isDeleted: { $ne: true } },
      select: 'name admissionNumber standard section currentJuzu status teacherId parentId',
      populate: {
        path: 'teacherId',
        select: 'username fullName',
      },
    })
    .populate({
      path: 'teacher',
      select: 'username fullName',
    });

  if (!classDoc) {
    throw new AppError('Class not found', 404);
  }

  res.json({
    success: true,
    data: { class: classDoc },
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
  getClassById,
  createClass,
};

