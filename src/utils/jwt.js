// utils/jwt.js
const jwt = require("jsonwebtoken");

exports.generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES }
  );
};

exports.generateResetToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_RESET_SECRET,
    { expiresIn: process.env.JWT_RESET_EXPIRES || "15m" }
  );
};

// module.exports = { generateToken, generateResetToken }; 
