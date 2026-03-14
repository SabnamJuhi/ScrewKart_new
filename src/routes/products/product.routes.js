const express = require("express")
const adminAuth = require("../../middleware/admin.auth.middleware")
const router = express.Router()

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByProductCategory,
  getProductsBySubCategory,
  getProductsByCategory
} = require("../../controllers/products/product.controller")

router.post("/", adminAuth, createProduct)
router.get("/", getAllProducts)
router.get("/:id", getProductById)
router.get("/productCategory/:productCategoryId", getProductsByProductCategory)
router.get("/subcategory/:subCategoryId", getProductsBySubCategory)
router.get("/category/:categoryId", getProductsByCategory)
router.put("/:id", adminAuth, updateProduct)
router.delete("/:id", adminAuth, deleteProduct)

module.exports = router
