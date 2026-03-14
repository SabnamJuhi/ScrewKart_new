const express = require("express");
const router = express.Router();

const {
  addFeaturedCategories,
  getFeaturedCategories,
  updateFeaturedCategory,
  removeFeaturedCategory,
} = require("../../controllers/featureCategories/featureCategory.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");


// Add Featured Categories (Bulk Add)
router.post("/", adminAuthMiddleware, addFeaturedCategories);

// Get All Featured Categories
router.get("/", getFeaturedCategories);

// Update Featured Category
router.patch("/:id",adminAuthMiddleware,  updateFeaturedCategory);

// Delete Featured Category
router.delete("/:id", adminAuthMiddleware, removeFeaturedCategory);

module.exports = router;