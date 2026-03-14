const express = require("express")
const router = express.Router()

const {
  createSpecs,
  getSpecsByProduct,
  updateSpec,
  deleteSpec
} = require("../../controllers/products/productSpec.controller")

const adminAuth = require("../../middleware/admin.auth.middleware")

router.post("/", adminAuth, createSpecs)
router.get("/product/:productId", getSpecsByProduct)
router.put("/:id", adminAuth, updateSpec)
router.delete("/:id", adminAuth, deleteSpec)

module.exports = router
