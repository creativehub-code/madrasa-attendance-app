const { User } = require('../models');
const { signToken } = require('../utils/jwt');
const { AppError, asyncHandler } = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({
    username: username.toLowerCase().trim(),
  }).select('+password');

  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signToken(user._id, user.role);

  res.json({
    success: true,
    token,
    role: user.role,
    data: {
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword ?? true,
      },
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const user = await User.findById(userId || req.user?._id || req.user?.id).select('+password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  const token = signToken(user._id, user.role);

  res.json({
    success: true,
    token,
    role: user.role,
    data: {
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        mustChangePassword: false,
      },
    },
    message: 'Password changed successfully',
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  // Optionally load the student's standard if this is a Teacher
  let className = null;
  let standard = null;
  if (user.role === 'Teacher') {
    const { Student } = require('../models');
    const assigned = await Student.find({ teacherId: user._id, isActive: true, isDeleted: { $ne: true } })
      .select('standard')
      .limit(1)
      .lean();
    standard = assigned[0]?.standard || null;
    className = standard;
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        standard,
        className,
      },
    },
  });
});

module.exports = { login, changePassword, getMe };

