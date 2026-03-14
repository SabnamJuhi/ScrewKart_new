const express = require("express");
const router = express.Router();

// const upload = require("../../middleware/uploadCloudinary");
const upload = require("../../middleware/upload");

const {
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
} = require("../../controllers/banner/banner.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");


router.post("/", upload.single("image"), adminAuthMiddleware, createBanner);
router.get("/", getAllBanners);
router.put("/:id", upload.single("image"), adminAuthMiddleware, updateBanner);
router.delete("/:id", adminAuthMiddleware, deleteBanner);

module.exports = router;
