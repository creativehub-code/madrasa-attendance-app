const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwtSecret } = require('../config/env');
const { extractBearerToken } = require('../utils/jwt');
const { AppError, asyncHandler } = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    throw new AppError('Authentication required. Provide Bearer token.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(decoded.sub);

  if (!user || !user.isActive) {
    throw new AppError('User not found or deactivated', 401);
  }

  req.user = user;
  next();
});

const authorize = (...roles) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action', 403);
    }

    next();
  });

module.exports = { protect, authorize };
