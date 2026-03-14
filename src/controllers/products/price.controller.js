const ProductPrice = require("../../models/products/price.model")

/**
 * CREATE / UPDATE PRICE (UPSERT)
 */
exports.upsertProductPrice = async (req, res) => {
  try {
    const { productId, mrp, sellingPrice, currency } = req.body

    if (!productId || !mrp || !sellingPrice) {
      return res.status(400).json({
        message: "productId, mrp and sellingPrice are required"
      })
    }

    const discountPercentage =
      Math.round(((mrp - sellingPrice) / mrp) * 100)

    const [price, created] = await ProductPrice.findOrCreate({
      where: { productId },
      defaults: {
        mrp,
        sellingPrice,
        discountPercentage,
        currency: currency || "INR"
      }
    })

    if (!created) {
      await price.update({
        mrp,
        sellingPrice,
        discountPercentage,
        currency: currency || "INR"
      })
    }

    res.status(200).json({
      message: created ? "Price added" : "Price updated",
      data: price
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to save price",
      error: error.message
    })
  }
}

/**
 * GET PRICE BY PRODUCT
 */
exports.getPriceByProduct = async (req, res) => {
  try {
    const { productId } = req.params

    const price = await ProductPrice.findOne({
      where: { productId }
    })

    if (!price) {
      return res.status(404).json({
        message: "Price not found"
      })
    }

    res.status(200).json(price)
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch price",
      error: error.message
    })
  }
}

/**
 * DELETE PRICE
 */
exports.deletePrice = async (req, res) => {
  try {
    const { productId } = req.params

    const deleted = await ProductPrice.destroy({
      where: { productId }
    })

    if (!deleted) {
      return res.status(404).json({
        message: "Price not found"
      })
    }

    res.status(200).json({
      message: "Price deleted successfully"
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete price",
      error: error.message
    })
  }
}
