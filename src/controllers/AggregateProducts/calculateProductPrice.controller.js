
const {
  ProductVariant,
  ProductPrice,
  Product,
  StoreInventory,
} = require("../../models");

const priceService = require("../../services/price.service");

exports.calculateProductPrice = async (req, res) => {
  try {
    const { variantId, quantity, storeId } = req.body;

    if (!variantId || !quantity || !storeId) {
      return res.status(400).json({
        success: false,
        message: "variantId, quantity, storeId required",
      });
    }

    /* ---------------- GET STOCK ---------------- */
    const inventory = await StoreInventory.findOne({
      where: {
        variantId,
        storeId,
      },
    });

    const stock = inventory?.stock || 0;

    // ❌ OUT OF STOCK
    if (stock === 0) {
      return res.status(200).json({
        success: false,
        message: "Out of stock",
        stock,
      });
    }

    // ❌ EXCEEDS STOCK
    if (quantity > stock) {
      return res.status(200).json({
        success: false,
        message: "You have reached maximum qty available for this item",
        stock,
      });
    }

    /* ---------------- GET VARIANT ---------------- */
    const variant = await ProductVariant.findByPk(variantId, {
      include: [
        {
          model: ProductPrice,
          as: "price",
        },
        {
          model: Product,
          as: "product",
          attributes: ["gstRate"],
        },
      ],
    });

    if (!variant || !variant.price) {
      return res.status(404).json({
        success: false,
        message: "Price not found",
      });
    }

    const gstRate = Number(variant.product.gstRate || 0);

    /* ---------------- 🔥 DYNAMIC PRICE ---------------- */
    const priceResult = await priceService.getFinalPrice(
      variantId,
      quantity
    );

    const unitPrice = Number(priceResult.price);

    /* ---------------- GST ---------------- */
    const gstAmount = Math.round((unitPrice * gstRate) / 100);
    const finalPrice = Math.round(unitPrice + gstAmount);

    return res.json({
      success: true,
      data: {
        variantId,
        quantity,

        stock,

        pricingType: priceResult.type, // SLAB or BASE

        unitPrice,
        gstRate,
        gstAmount,
        finalPrice,

        total: finalPrice * quantity,
      },
    });
  } catch (error) {
    console.error("CALCULATE PRICE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};