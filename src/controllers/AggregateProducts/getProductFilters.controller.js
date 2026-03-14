const sequelize = require("../../config/db");


const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantSize = require("../../models/productVariants/variantSize.model");


const { Category, SubCategory, ProductCategory } = require("../../models");


exports.getProductFilters = async (req, res) => {
  try {
    /* ---------------- BRANDS ---------------- */
    const brandsRaw = await Product.findAll({
      attributes: ["brandName"],
      group: ["brandName"],
      raw: true,
    });

    const brands = brandsRaw.map((b) => b.brandName).filter(Boolean);

    /* ---------------- CATEGORY TREE ---------------- */
    const categories = await Category.findAll({
      attributes: ["id", "name", "isActive"],
      include: [
        {
          model: SubCategory,
          as: "subcategories",
          attributes: ["id", "name", "isActive"],
          include: [
            {
              model: ProductCategory,
              as: "productCategories",
              attributes: ["id", "name", "isActive"],
            },
          ],
        },
      ],
    });

    /* ---------------- COLORS (FIXED FOR TiDB) ---------------- */
    const colorsRaw = await ProductVariant.findAll({
      attributes: ["colorName", "colorCode"],
      group: ["colorName", "colorCode"],
      raw: true,
    });

    const colors = colorsRaw
      .filter((c) => c.colorName && c.colorCode)
      .map((c) => ({
        name: c.colorName,
        code: c.colorCode,
      }));

    /* ---------------- SIZES ---------------- */
    // const sizesRaw = await VariantSize.findAll({
    //   attributes: ["size"],
    //   group: ["size"],
    //   raw: true,
    // });

    // const sizes = sizesRaw.map((s) => s.size).filter(Boolean);

    /* ---------------- SIZES ---------------- */
const sizesRaw = await VariantSize.findAll({
  attributes: ["diameter", "length"],
  group: ["diameter", "length"],
  raw: true,
});

const sizes = sizesRaw
  .filter((s) => s.diameter && s.length)
  .map((s) => ({
    diameter: s.diameter,
    length: s.length,
    display: `M${s.diameter} × ${s.length}`,
    value: `${s.diameter}-${s.length}`, // for filtering
  }));

    /* ---------------- SPECS ---------------- */
    const specsRaw = await ProductSpec.findAll({
      attributes: ["specKey", "specValue"],
      raw: true,
    });

    const specs = {};

    specsRaw.forEach((s) => {
      if (!specs[s.specKey]) specs[s.specKey] = new Set();

      s.specValue.split(",").forEach((v) => {
        specs[s.specKey].add(v.trim());
      });
    });

    Object.keys(specs).forEach((k) => {
      specs[k] = Array.from(specs[k]);
    });

    /* ---------------- PRICE RANGE ---------------- */
    const priceRaw = await ProductPrice.findOne({
      attributes: [
        [sequelize.fn("MIN", sequelize.col("sellingPrice")), "min"],
        [sequelize.fn("MAX", sequelize.col("sellingPrice")), "max"],
      ],
      raw: true,
    });

    const priceRange = {
      min: Number(priceRaw?.min || 0),
      max: Number(priceRaw?.max || 0),
    };

    /* ---------------- AVAILABILITY ---------------- */
    const availabilityRaw = await ProductVariant.findAll({
      attributes: ["stockStatus"],
      group: ["stockStatus"],
      raw: true,
    });

    const availability = availabilityRaw
      .map((a) => a.stockStatus)
      .filter(Boolean);

    /* ---------------- RESPONSE ---------------- */
    return res.json({
      success: true,
      filters: {
        brands,
        categories,
        colors,
        sizes,
        specs,
        priceRange,
        availability,
      },
    });
  } catch (error) {
    console.error("FILTER METADATA ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};