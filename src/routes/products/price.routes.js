const express = require("express")
const router = express.Router()

const {
  upsertProductPrice,
  getPriceByProduct,
  deletePrice
} = require("../../controllers/products/price.controller")

router.post("/", upsertProductPrice)
router.get("/:productId", getPriceByProduct)
router.delete("/:productId", deletePrice)

module.exports = router
