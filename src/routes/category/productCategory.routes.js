const express = require("express")
const adminAuth = require("../../middleware/admin.auth.middleware")
const router = express.Router()

const {
  createProductCategory,
  getAllProductCategories,
  getByCategory,
  getBySubCategory,
  updateProductCategory,
  deleteProductCategory
} = require("../../controllers/category/productCategory.controller")

router.post("/", adminAuth, createProductCategory)
router.get("/", getAllProductCategories)
router.get("/category/:categoryId", getByCategory)
router.get("/subcategory/:subCategoryId", getBySubCategory)
router.put("/:id", adminAuth, updateProductCategory)
router.delete("/:id", adminAuth, deleteProductCategory)

module.exports = router
