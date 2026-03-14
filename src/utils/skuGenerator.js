// const ProductSpec = require("../models/products/productSpec.model");
// const VariantSize = require("../models/productVariants/variantSize.model");
// const ProductVariant = require("../models/productVariants/productVariant.model");

// async function generateSKU(product, transaction) {
//   const categoryCode =
//     product.Category?.name?.substring(0, 2).toUpperCase() || "NA";

//   const subCategoryCode =
//     product.SubCategory?.name?.substring(0, 4).toUpperCase() || "NA";

//   const productCategoryCode =
//     product.ProductCategory?.name?.substring(0, 2).toUpperCase() || "NA";

//   /* ---- Grade ---- */
//   const gradeSpec = await ProductSpec.findOne({
//     where: { productId: product.id, specKey: "Grade" },
//     transaction,
//   });

//   const grade = gradeSpec?.specValue || "00";

//   /* ---- Pack Quantity ---- */
//   const packSpec = await ProductSpec.findOne({
//     where: { productId: product.id, specKey: "PackQuantity" },
//     transaction,
//   });

//   const packQty = packSpec?.specValue || "1";

//   /* ---- First Variant Size ---- */
//   const size = await VariantSize.findOne({
//     include: [
//       {
//         model: ProductVariant,
//         where: { productId: product.id },
//       },
//     ],
//     order: [["createdAt", "ASC"]],
//     transaction,
//   });

//   const diameter = size?.diameter || "0";
//   const length = size?.length || "0";

//   return `SK-${categoryCode}-${subCategoryCode}-${productCategoryCode}-${grade}-M${diameter}-${length}-${packQty}-${Date.now()}`;
// }

// module.exports = generateSKU;



// const Category = require("../models/category/category.model");
// const SubCategory = require("../models/category/subcategory.model");
// const ProductCategory = require("../models/category/productCategory.model");
// const ProductSpec = require("../models/products/productSpec.model");
// const VariantSize = require("../models/productVariants/variantSize.model");
// const ProductVariant = require("../models/productVariants/productVariant.model");

// async function generateSKU(product, transaction) {
//   /* ---- Category Code ---- */
//   const category = await Category.findByPk(product.categoryId);
//   const categoryCode = category?.code || "NA";

//   /* ---- SubCategory Code ---- */
//   const subCategory = await SubCategory.findByPk(product.subCategoryId);
//   const subCategoryCode = subCategory?.code || "NA";

//   /* ---- Product Category Code ---- */
//   const productCategory = await ProductCategory.findByPk(product.productCategoryId);
//   const productCategoryCode = productCategory?.code || "NA";

//   /* ---- Grade from ProductSpec ---- */
//   const gradeSpec = await ProductSpec.findOne({
//     where: { productId: product.id, specKey: "Grade" },
//     transaction,
//   });

//   const grade = gradeSpec?.specValue || "00";

//   /* ---- Pack Quantity ---- */
//   const packSpec = await ProductSpec.findOne({
//     where: { productId: product.id, specKey: "PackQuantity" },
//     transaction,
//   });

//   const packQty = packSpec?.specValue || "1";

//   /* ---- First Variant Size ---- */
//   const size = await VariantSize.findOne({
//     include: [{ model: ProductVariant, where: { productId: product.id } }],
//     order: [["createdAt", "ASC"]],
//     transaction,
//   });

//   const diameter = size?.diameter || "0";
//   const length = size?.length || "0";

//   return `SK-${categoryCode}-${subCategoryCode}-${productCategoryCode}-${grade}-M${diameter}-${length}-${packQty}-${Date.now()}`;
// }

// module.exports = generateSKU;


const VariantSize = require("../models/productVariants/variantSize.model");
const ProductVariant = require("../models/productVariants/productVariant.model");

async function generateSKU(product, transaction) {

  /* ---- CATEGORY CODE ---- */
  const categoryCode =
    product.Category?.name?.substring(0, 2).toUpperCase() || "NA";

  const subCategoryCode =
    product.SubCategory?.name?.substring(0, 4).toUpperCase() || "NA";

  const productCategoryCode =
    product.ProductCategory?.name?.substring(0, 2).toUpperCase() || "NA";


  /* ---- FIRST VARIANT ---- */
  const variant = await ProductVariant.findOne({
    where: { productId: product.id },
    order: [["createdAt", "ASC"]],
    transaction,
  });

  const grade = variant?.grade || "00";
  const packQty = variant?.packQuantity || "1";


  /* ---- FIRST SIZE ---- */
  const size = await VariantSize.findOne({
    where: { variantId: variant?.id },
    order: [["createdAt", "ASC"]],
    transaction,
  });

  const diameter = size?.diameter || "0";
  const length = size?.length || "0";


  /* ---- FINAL SKU ---- */
  const sku = `SK-${categoryCode}-${subCategoryCode}-${productCategoryCode}-${grade}-M${diameter}-${length}-${packQty}-${Date.now()}`;

  return sku;
}

module.exports = generateSKU;