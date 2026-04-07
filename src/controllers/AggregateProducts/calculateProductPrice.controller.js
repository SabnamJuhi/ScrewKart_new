const { ProductVariant, ProductPrice, Product } = require("../../models");
const priceService = require("../../services/price.service");


exports.calculateProductPrice = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;

    // ✅ VALIDATION
    if (!variantId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "variantId and quantity are required",
      });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "quantity must be a valid number greater than 0",
      });
    }

    // ✅ GET VARIANT (ONLY FOR GST)
    const variant = await ProductVariant.findByPk(variantId, {
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["gstRate"],
        },
      ],
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    const gstRate = Number(variant.product?.gstRate || 0);

    // 🔥 MAIN LOGIC (SLAB + BASE)
    const finalPriceData = await priceService.getFinalPrice(
      variantId,
      qty
    );

    const unitPrice = Number(finalPriceData.price) || 0;

    // ✅ GST CALCULATION
    const gstAmount = Math.round((unitPrice * gstRate) / 100);
    const finalPrice = unitPrice + gstAmount;
    const total = finalPrice * qty;

    return res.json({
      success: true,
      data: {
        variantId,
        quantity: qty,

        pricingType: finalPriceData.type, // SLAB or BASE

        unitPrice,
        gstRate,
        gstAmount,
        finalPrice,
        total,
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