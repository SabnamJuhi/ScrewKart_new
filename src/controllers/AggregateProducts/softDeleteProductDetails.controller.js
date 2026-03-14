const sequelize = require("../../config/db");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const VariantSize = require("../../models/productVariants/variantSize.model");
const ProductRating = require("../../models/products/productRating.model");
const ProductReview = require("../../models/products/productReview.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

/* =========================================================
   SOFT DELETE PRODUCT (CASCADE)
========================================================= */
exports.softDeleteProduct = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id: productId } = req.params;

    /* ---------- FIND PRODUCT ---------- */
    const product = await Product.findByPk(productId, { transaction: t });

    if (!product) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /* ---------- SOFT DELETE PRODUCT ---------- */
    await product.update({ isActive: false }, { transaction: t });

    /* ---------- SOFT DELETE DIRECT CHILD TABLES ---------- */
    await ProductPrice.update(
      { isActive: false },
      { where: { productId }, transaction: t }
    );

    await ProductSpec.update(
      { isActive: false },
      { where: { productId }, transaction: t }
    );

    await ProductRating.update(
      { isActive: false },
      { where: { productId }, transaction: t }
    );

    await ProductReview.update(
      { isActive: false },
      { where: { productId }, transaction: t }
    );

    await OfferApplicableProduct.update(
      { isActive: false },
      { where: { productId }, transaction: t }
    );

    /* ---------- FIND VARIANTS ---------- */
    const variants = await ProductVariant.findAll({
      where: { productId },
      attributes: ["id"],
      transaction: t,
    });

    const variantIds = variants.map((v) => v.id);

    /* ---------- SOFT DELETE VARIANTS + NESTED ---------- */
    if (variantIds.length) {
      await ProductVariant.update(
        { isActive: false },
        { where: { id: variantIds }, transaction: t }
      );

      await VariantSize.update(
        { isActive: false },
        { where: { variantId: variantIds }, transaction: t }
      );

      await VariantImage.update(
        { isActive: false },
        { where: { variantId: variantIds }, transaction: t }
      );
    }

    /* ---------- COMMIT ---------- */
    await t.commit();

    return res.json({
      success: true,
      message: "Product archived successfully with all related data",
    });
  } catch (error) {
    await t.rollback();

    console.error("SOFT DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
