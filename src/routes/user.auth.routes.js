

// routes/auth.routes.js
const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getUsers,
  getUserById,
  deleteUser,
  logout,
} = require("../controllers/user.auth.controller");
const { protect } = require("../middleware/user.auth.middleware");
const {protected} = require("../middleware/user.logout.middleware")
const adminAuth = require("../middleware/admin.auth.middleware");
const { allowAdminRoles } = require("../middleware/admin.role.middleware");
const { sendOtp } = require("../controllers/otpVerification/userOtpSend.controller");
const { verifyOtp } = require("../controllers/otpVerification/userOtpVerifyAndLogin.controller");

const router = express.Router();

// Normal auth
router.post("/register", register);
router.post("/login", login);

router.delete("/users/:id", protected, deleteUser);
// router.delete("/admin/users/:id", protected, adminAuth, deleteUser);
router.post("/logout", protected, logout);
router.get("/users", adminAuth,  allowAdminRoles("superAdmin"), getUsers);
router.get("/users/:id", protected, getUserById);

// Forgot-password
router.post("/forgotPassword", forgotPassword);

// Resest-Password
router.post("/resetPassword", resetPassword);

router.post("/sendOtp", sendOtp)
router.post("/verifyOtp", verifyOtp)

// Google auth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES,
    });

    res.redirect(`http://localhost:5173/auth-success?token=${token}`);
  },
);

module.exports = router;
