

const ProductVariant = require("../models/productVariants/productVariant.model");
const ProductMeasurement = require("../models/products/productMeasurement.model");

async function generateSKU(product, transaction) {

  /* ---- CATEGORY CODE ---- */
  const categoryCode =
    product.Category?.name?.substring(0, 2).toUpperCase() || "NA";

  const subCategoryCode =
    product.SubCategory?.name?.substring(0, 4).toUpperCase() || "NA";

  const productCategoryCode =
    product.ProductCategory?.name?.substring(0, 2).toUpperCase() || "NA";

  /* ---- VARIANT ---- */
  const variant = await ProductVariant.findOne({
    where: { productId: product.id },
    order: [["createdAt", "ASC"]],
    transaction,
  });

  if (!variant) {
    return `SK-${categoryCode}-${subCategoryCode}-${productCategoryCode}-${Date.now()}`;
  }

  /* ---- MEASUREMENTS (DYNAMIC) ---- */
  const measurements = await ProductMeasurement.findAll({
    where: { variantId: variant.id },
    transaction,
  });

  // 👉 Build measurement string dynamically
  let measurementPart = "NA";

  if (measurements.length > 0) {
    measurementPart = measurements
      .map((m) => `${m.value}`) // or `${m.measurementId}:${m.value}`
      .join("x"); // separator
  }

  /* ---- VARIANT INFO ---- */
  const variantCode = variant.variantCode || "V0";
  const moq = variant.moq || 1;

  /* ---- FINAL SKU ---- */
  const sku = `SK-${categoryCode}-${subCategoryCode}-${productCategoryCode}-${variantCode}-${measurementPart}-${moq}-${Date.now()}`;

  return sku;
}

module.exports = generateSKU;