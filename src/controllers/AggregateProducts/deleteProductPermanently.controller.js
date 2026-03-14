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
   PERMANENT DELETE PRODUCT (CASCADE HARD DELETE)
========================================================= */
exports.deleteProductPermanently = async (req, res) => {
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

    /* ---------- FETCH VARIANTS ---------- */
    const variants = await ProductVariant.findAll({
      where: { productId },
      attributes: ["id"],
      transaction: t,
    });

    const variantIds = variants.map((v) => v.id);

    /* ---------- DELETE VARIANT CHILD TABLES ---------- */
    if (variantIds.length) {
      await VariantSize.destroy({
        where: { variantId: variantIds },
        transaction: t,
      });

      await VariantImage.destroy({
        where: { variantId: variantIds },
        transaction: t,
      });

      await ProductVariant.destroy({
        where: { id: variantIds },
        transaction: t,
      });
    }

    /* ---------- DELETE PRODUCT RELATED TABLES ---------- */
    await ProductSpec.destroy({ where: { productId }, transaction: t });
    await ProductPrice.destroy({ where: { productId }, transaction: t });
    await ProductRating.destroy({ where: { productId }, transaction: t });
    await ProductReview.destroy({ where: { productId }, transaction: t });
    await OfferApplicableProduct.destroy({ where: { productId }, transaction: t });

    /* ---------- FINALLY DELETE PRODUCT ---------- */
    await Product.destroy({
      where: { id: productId },
      transaction: t,
    });

    /* ---------- COMMIT ---------- */
    await t.commit();

    return res.json({
      success: true,
      message: "Product permanently deleted with all related data",
    });
  } catch (error) {
    await t.rollback();

    console.error("DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
