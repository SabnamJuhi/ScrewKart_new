const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const TokenBlacklist = require("../models/tokenBlacklist.model");

const protected = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2️⃣ Token missing
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    // Check blacklist (for logout)
  const isBlacklisted = await TokenBlacklist.findOne({ where: { token } });


    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    // 4️⃣ ✅ Verify using LOGIN secret (NOT reset secret)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5️⃣ Find user
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 6️⃣ Attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Not authorized, token invalid or expired",
    });
  }
};


const optionalAuth = (req, res, next)=> {
  const authHeader = req.headers.authorization;

  if (!authHeader) return next();

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // ignore invalid token for public routes
  }

  next();
};


module.exports = { protected, optionalAuth };
