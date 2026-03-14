const ReviewReaction = require("../../models/products/reviewReaction.model");
const ProductReview = require("../../models/products/productReview.model");

/**
 * LIKE / DISLIKE TOGGLE
 */
exports.reactToReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { type } = req.body;
    const userId = req.user.id;

    if (!["like", "dislike"].includes(type)) {
      return res.status(400).json({ message: "Invalid reaction type" });
    }

    let reaction = await ReviewReaction.findOne({
      where: { reviewId, userId },
    });

    if (!reaction) {
      await ReviewReaction.create({ reviewId, userId, type });
    } else if (reaction.type === type) {
      await reaction.destroy(); // toggle off
    } else {
      reaction.type = type;
      await reaction.save();
    }

    // recalc counters
    const likes = await ReviewReaction.count({
      where: { reviewId, type: "like" },
    });

    const dislikes = await ReviewReaction.count({
      where: { reviewId, type: "dislike" },
    });

    await ProductReview.update(
      { likes, dislikes },
      { where: { id: reviewId } }
    );

    res.json({
      success: true,
      likes,
      dislikes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Reaction failed",
      error: error.message,
    });
  }
};
