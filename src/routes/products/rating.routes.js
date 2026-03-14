const express = require("express")
const router = express.Router()
const ratingController = require("../../controllers/products/productRating.controller")

router.get("/:productId", ratingController.getProductRating)

module.exports = router