const express = require("express")
const adminAuth = require("../../middleware/admin.auth.middleware")
const router = express.Router()

const {
  createSubCategory,
  getAllSubCategories,
  getSubCategoriesByCategory,
  updateSubCategory,
  deleteSubCategory
} = require("../../controllers/category/subcategory.controller")

router.post("/",adminAuth, createSubCategory)
router.get("/", getAllSubCategories)
router.get("/category/:categoryId", getSubCategoriesByCategory)
router.put("/:id",adminAuth, updateSubCategory)
router.delete("/:id",adminAuth, deleteSubCategory)

module.exports = router

