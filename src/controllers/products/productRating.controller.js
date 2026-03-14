const ProductReview = require("../../models/products/productReview.model")
const {
  calculateRatingFromReviews
} = require("../../services/rating.service")

exports.getProductRating = async (req, res) => {
  try {
    const { productId } = req.params

    const reviews = await ProductReview.findAll({
      where: { productId }
    })

    const ratingSummary = calculateRatingFromReviews(reviews)

    res.status(200).json({
      productId,
      ...ratingSummary
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch product rating",
      error: error.message
    })
  }
}
