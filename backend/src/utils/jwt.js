const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const signToken = (userId, role) =>
  jwt.sign({ sub: userId, role }, jwtSecret, { expiresIn: jwtExpiresIn });

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
};

module.exports = { signToken, extractBearerToken };
