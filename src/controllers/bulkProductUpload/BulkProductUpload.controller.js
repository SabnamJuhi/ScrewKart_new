// const xlsx = require("xlsx");
// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");
// const generateSKU = require("../../utils/skuGenerator");

// const parseJSON = (data, fieldName) => {
//   try {
//     return typeof data === "string" ? JSON.parse(data) : data;
//   } catch {
//     throw new Error(`Invalid JSON format in "${fieldName}"`);
//   }
// };

// exports.bulkCreateProductsFromExcel = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     if (!req.file) throw new Error("Excel file is required");

//     const workbook = xlsx.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = xlsx.utils.sheet_to_json(sheet);

//     if (!rows.length) throw new Error("Excel sheet is empty");

//     const productMap = {};

//     for (const row of rows) {
//       const {
//         title,
//         brandName,
//         categoryId,
//         subCategoryId,
//         productCategoryId,
//         description,
//         badge,
//         gstRate,
//         mrp,
//         sellingPrice,
//         currency,
//         specs,
//         variantCode,
//         colorName,
//         colorCode,
//         colorSwatch,
//         totalStock,
//         length,
//         diameter,
//         sizeStock,
//       } = row;

//       if (!title || !categoryId || !subCategoryId || !productCategoryId) {
//         throw new Error(`Missing required product fields for ${title}`);
//       }

//       const productKey = `${title}-${categoryId}-${subCategoryId}-${productCategoryId}`;

//       /* ---------------- CREATE PRODUCT ONCE ---------------- */
//       if (!productMap[productKey]) {
//         const product = await Product.create(
//           {
//             title,
//             brandName,
//             categoryId: Number(categoryId),
//             subCategoryId: Number(subCategoryId),
//             productCategoryId: Number(productCategoryId),
//             description,
//             badge,
//             gstRate: Number(gstRate) || 0,
//           },
//           { transaction: t },
//         );
//         /* ---------------- PRICE ---------------- */
//         await ProductPrice.create(
//           {
//             productId: product.id,
//             mrp: Number(mrp) || 0,
//             sellingPrice: Number(sellingPrice) || 0,
//             discountPercentage:
//               Number(mrp) > Number(sellingPrice)
//                 ? Math.round(
//                     ((Number(mrp) - Number(sellingPrice)) / Number(mrp)) * 100,
//                   )
//                 : 0,
//             currency: currency || "INR",
//           },
//           { transaction: t },
//         );

//         /* ---------------- SPECS ---------------- */
//         if (specs) {
//           const parsedSpecs = parseJSON(specs, "specs");

//           const specRows = Object.keys(parsedSpecs).map((key) => ({
//             productId: product.id,
//             specKey: key,
//             specValue: Array.isArray(parsedSpecs[key])
//               ? parsedSpecs[key].join(", ")
//               : parsedSpecs[key],
//           }));

//           if (specRows.length) {
//             await ProductSpec.bulkCreate(specRows, { transaction: t });
//           }
//         }

//         productMap[productKey] = {
//           product,
//           variants: {},
//         };
//       }

//       const currentProduct = productMap[productKey].product;

//       /* ---------------- VARIANT UNIQUE ---------------- */
//       if (!variantCode) {
//         throw new Error(`variantCode is required for product ${title}`);
//       }

//       if (!productMap[productKey].variants[variantCode]) {
//         const variant = await ProductVariant.create(
//           {
//             productId: currentProduct.id,
//             variantCode,
//             colorName,
//             colorCode,
//             colorSwatch,
//             totalStock: Number(totalStock) || 0,
//             stockStatus: Number(totalStock) > 0 ? "In Stock" : "Out of Stock",
//           },
//           { transaction: t },
//         );

//         productMap[productKey].variants[variantCode] = variant;
//       }

//       const currentVariant = productMap[productKey].variants[variantCode];

//       /* ---------------- SIZE ---------------- */
//       if (length || diameter) {
//         await VariantSize.create(
//           {
//             variantId: currentVariant.id,
//             stock: Number(sizeStock) || 0,
//             length: length || null,
//             diameter: diameter || null,
//           },
//           { transaction: t },
//         );
//       }
//     }

//     /* ---------------- GENERATE SKU AFTER DATA INSERT ---------------- */
//     for (const key of Object.keys(productMap)) {
//       const p = productMap[key].product;

//       const fullProduct = await Product.findByPk(p.id, {
//         include: ["Category", "SubCategory", "ProductCategory"],
//         transaction: t,
//       });

//       const generatedSku = await generateSKU(fullProduct, t);

//       await p.update({ sku: generatedSku }, { transaction: t });

//       productMap[key].sku = generatedSku; // optional tracking
//     }

//     await t.commit();

//     return res.status(201).json({
//       success: true,
//       message: "Bulk products created successfully",
//       totalProducts: Object.keys(productMap).length,
//     });
//   } catch (error) {
//     if (t && !t.finished) await t.rollback();

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


const xlsx = require("xlsx");
const sequelize = require("../../config/db");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const ProductAttribute = require("../../models/products/productAttribute.model");
const ProductMeasurement = require("../../models/products/productMeasurement.model");
const VariantPricingSlab = require("../../models/products/variantPricingSlab.model");

const generateSKU = require("../../utils/skuGenerator");

const parseJSON = (data, field) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    throw new Error(`Invalid JSON in ${field}`);
  }
};

exports.bulkCreateProductsFromExcel = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    if (!req.file) throw new Error("Excel file is required");

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, {
  defval: "",
  raw: false,
  blankrows: false,
});

    if (!rows.length) throw new Error("Excel is empty");

    const productMap = {};

    for (const row of rows) {
      const {
        title,
        brandName,
        categoryId,
        subCategoryId,
        productCategoryId,
        description,
        badge,
        gstRate,

        variantCode,
        unit,
        moq,
        packingType,
        packQuantity,
        dispatchType,
        deliverySla,
        totalStock,

        mrp,
        sellingPrice,
        currency,

        attributes,        // JSON
        measurements,      // JSON
        pricingSlabs       // JSON array
      } = row;

      if (!title || !categoryId || !subCategoryId || !productCategoryId) {
        throw new Error(`Missing product fields for ${title}`);
      }

      const key = `${title}-${categoryId}-${subCategoryId}-${productCategoryId}`;

      /* ---------------- PRODUCT ---------------- */
      if (!productMap[key]) {
        const product = await Product.create({
          title,
          brandName,
          categoryId,
          subCategoryId,
          productCategoryId,
          description,
          badge,
          gstRate: gstRate || 0,
        }, { transaction: t });

        productMap[key] = { product, variants: {} };
      }

      const product = productMap[key].product;

      /* ---------------- VARIANT ---------------- */
      if (!productMap[key].variants[variantCode]) {
        const variant = await ProductVariant.create({
          productId: product.id,
          variantCode,
          unit,
          moq,
          packingType,
          packQuantity,
          dispatchType,
          deliverySla,
          totalStock,
          stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",
        }, { transaction: t });

        /* ---------------- PRICE (VARIANT LEVEL) ---------------- */
        await ProductPrice.create({
          variantId: variant.id,
          mrp,
          sellingPrice,
          discountPercentage:
            mrp > sellingPrice
              ? ((mrp - sellingPrice) / mrp) * 100
              : 0,
          currency: currency || "INR",
        }, { transaction: t });

        /* ---------------- ATTRIBUTES ---------------- */
        if (attributes) {
          const parsed = parseJSON(attributes, "attributes");

          const attrRows = Object.entries(parsed).map(([k, v]) => ({
            productId: product.id,
            variantId: variant.id,
            attributeKey: k,
            attributeValue: v,
          }));

          await ProductAttribute.bulkCreate(attrRows, { transaction: t });
        }

        /* ---------------- MEASUREMENTS ---------------- */
        if (measurements) {
          const parsed = parseJSON(measurements, "measurements");

          const measRows = Object.entries(parsed).map(([k, v]) => ({
            productId: product.id,
            variantId: variant.id,
            measurementId: Number(k), // assuming ID mapping
            value: v,
          }));

          await ProductMeasurement.bulkCreate(measRows, { transaction: t });
        }

        /* ---------------- PRICING SLABS ---------------- */
        if (pricingSlabs) {
          const slabs = parseJSON(pricingSlabs, "pricingSlabs");

          const slabRows = slabs.map((s) => ({
            variantId: variant.id,
            minQty: s.minQty,
            maxQty: s.maxQty || null,
            price: s.price,
          }));

          await VariantPricingSlab.bulkCreate(slabRows, { transaction: t });
        }

        productMap[key].variants[variantCode] = variant;
      }
    }

    /* ---------------- SKU GENERATION ---------------- */
    for (const key of Object.keys(productMap)) {
      const p = productMap[key].product;

      const fullProduct = await Product.findByPk(p.id, { transaction: t });

      const sku = await generateSKU(fullProduct, t);

      await p.update({ sku }, { transaction: t });
    }

    await t.commit();

    return res.json({
      success: true,
      message: "Bulk upload completed",
      products: Object.keys(productMap).length,
    });
  } catch (err) {
    if (t && !t.finished) await t.rollback();

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};