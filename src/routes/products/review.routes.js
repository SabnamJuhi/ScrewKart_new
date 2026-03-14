
const express = require("express")
const router = express.Router()
const {protected} = require("../../middleware/user.logout.middleware")
const reviewController = require("../../controllers/products/productReview.controller")
const { reactToReview } = require("../../controllers/products/reviewReaction.controller")

// Reviews
router.post("/", protected, reviewController.createReview)
router.get("/:productId", reviewController.getReviewsByProduct)
router.put("/:id", protected, reviewController.updateReview)
router.delete("/:id", protected, reviewController.deleteReview)
router.post("/:id/react", protected, reactToReview)
// router.post("/react/:productId", protected, reactToReview)


module.exports = router