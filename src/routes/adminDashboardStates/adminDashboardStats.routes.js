const express = require("express");
const router = express.Router();

const { getDashboardStats } = require("../../controllers/adminDashboardStats/adminDashboardStats.controller");

// Middleware
const { protected } = require("../../middleware/user.logout.middleware");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");


// GET /api/admin/dashboard/stats
router.get(
  "/stats",
  adminAuthMiddleware,
  getDashboardStats
);

module.exports = router;