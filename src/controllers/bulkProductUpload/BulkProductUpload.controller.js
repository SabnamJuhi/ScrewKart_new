// const xlsx = require("xlsx");
// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");

// /**
//  * EXPECTED EXCEL COLUMNS:
//  * title | brandName | categoryId | subCategoryId | productCategoryId |
//  * description | badge | gstRate | mrp | sellingPrice |
//  * colorName | colorCode | size | stock | chest
//  */

// exports.bulkCreateProductsFromExcel = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     if (!req.file) throw new Error("Excel file is required");

//     const workbook = xlsx.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];

//     const rows = xlsx.utils.sheet_to_json(sheet);

//     if (!rows.length) throw new Error("Excel sheet is empty");

//     const createdProducts = [];

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
//         colorName,
//         colorCode,
//         size,
//         stock,
//         chest,
//          ...specColumns
//       } = row;

//       if (!title || !categoryId || !subCategoryId || !productCategoryId) {
//         throw new Error(`Missing required fields for product: ${title}`);
//       }

//       const numericGst = Number(gstRate);
//       if (isNaN(numericGst)) throw new Error(`Invalid GST for ${title}`);

//       /* -------- CREATE PRODUCT -------- */
//       const product = await Product.create(
//         {
//           title,
//           brandName,
//           categoryId: Number(categoryId),
//           subCategoryId: Number(subCategoryId),
//           productCategoryId: Number(productCategoryId),
//           description,
//           badge,
//           gstRate: numericGst,
//         },
//         { transaction: t }
//       );

//       /* -------- PRICE -------- */
//       await ProductPrice.create(
//         {
//           productId: product.id,
//           mrp: Number(mrp),
//           sellingPrice: Number(sellingPrice),
//           discountPercentage:
//             mrp > sellingPrice
//               ? Math.round(((mrp - sellingPrice) / mrp) * 100)
//               : 0,
//           currency: "INR",
//         },
//         { transaction: t }
//       );
//        /* -------- PRODUCT SPECS (NEW) -------- */
//       const specRows = Object.entries(specColumns)
//         .filter(([key, value]) => value !== undefined && value !== "")
//         .map(([key, value]) => ({
//           productId: product.id,
//           specKey: key,
//           specValue: String(value),
//         }));

//       if (specRows.length) {
//         await ProductSpec.bulkCreate(specRows, { transaction: t });
//       }

//       /* -------- VARIANT -------- */
//       const variant = await ProductVariant.create(
//         {
//           productId: product.id,
//           variantCode: `VAR-${product.id}`,
//           colorName,
//           colorCode,
//           totalStock: Number(stock) || 0,
//           stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
//         },
//         { transaction: t }
//       );

//       /* -------- SIZE -------- */
//       await VariantSize.create(
//         {
//           variantId: variant.id,
//           size,
//           stock: Number(stock) || 0,
//           chest: chest || null,
//         },
//         { transaction: t }
//       );

//       createdProducts.push(product.id);
//     }

//     await t.commit();

//     return res.json({
//       success: true,
//       message: "Bulk products created successfully",
//       totalCreated: createdProducts.length,
//       productIds: createdProducts,
//     });
//   } catch (error) {
//     await t.rollback();

//     console.error("BULK UPLOAD ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const xlsx = require("xlsx");
// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");

// exports.bulkCreateProductsFromExcel = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     if (!req.file) throw new Error("Excel file is required");

//     const workbook = xlsx.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = xlsx.utils.sheet_to_json(sheet);

//     if (!rows.length) throw new Error("Excel sheet is empty");

//     const productMap = {}; // prevent duplicate products

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

//         specKey,
//         specValue,

//         variantCode,
//         colorName,
//         colorCode,
//         colorSwatch,
//         totalStock,

//         size,
//         chest,
//         sizeStock
//       } = row;

//       if (!title || !categoryId || !subCategoryId || !productCategoryId) {
//         throw new Error(`Missing required product fields for ${title}`);
//       }

//       const productKey = `${title}-${categoryId}-${subCategoryId}-${productCategoryId}`;

//       /* ---------------- CREATE PRODUCT (ONCE) ---------------- */
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
//           { transaction: t }
//         );

//         /* PRICE */
//         await ProductPrice.create(
//           {
//             productId: product.id,
//             mrp: Number(mrp),
//             sellingPrice: Number(sellingPrice),
//             discountPercentage:
//               mrp > sellingPrice
//                 ? Math.round(((mrp - sellingPrice) / mrp) * 100)
//                 : 0,
//             currency: currency || "INR",
//           },
//           { transaction: t }
//         );

//         productMap[productKey] = {
//           product,
//           variants: {}
//         };
//       }

//       const currentProduct = productMap[productKey].product;

//       /* ---------------- SPECS ---------------- */
//       if (specKey && specValue) {
//         await ProductSpec.create(
//           {
//             productId: currentProduct.id,
//             specKey,
//             specValue,
//           },
//           { transaction: t }
//         );
//       }

//       /* ---------------- VARIANT (UNIQUE BY variantCode) ---------------- */
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
//             stockStatus:
//               Number(totalStock) > 0 ? "In Stock" : "Out of Stock",
//           },
//           { transaction: t }
//         );

//         productMap[productKey].variants[variantCode] = variant;
//       }

//       const currentVariant =
//         productMap[productKey].variants[variantCode];

//       /* ---------------- SIZE ---------------- */
//       if (size) {
//         await VariantSize.create(
//           {
//             variantId: currentVariant.id,
//             size,
//             chest: chest || null,
//             stock: Number(sizeStock) || 0,
//           },
//           { transaction: t }
//         );
//       }
//     }

//     await t.commit();

//     return res.json({
//       success: true,
//       message: "Bulk products created successfully",
//       totalProducts: Object.keys(productMap).length,
//     });
//   } catch (error) {
//     await t.rollback();

//     console.error("BULK UPLOAD ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

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

//     const productMap = {}; // prevent duplicates

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
//         specs, // JSON column
//         variantCode,
//         colorName,
//         colorCode,
//         colorSwatch,
//         totalStock,
//         size,
//         chest,
//         sizeStock
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
//           { transaction: t }
//         );

//         await ProductPrice.create(
//           {
//             productId: product.id,
//             mrp: Number(mrp),
//             sellingPrice: Number(sellingPrice),
//             discountPercentage:
//               mrp > sellingPrice
//                 ? Math.round(((mrp - sellingPrice) / mrp) * 100)
//                 : 0,
//             currency: currency || "INR",
//           },
//           { transaction: t }
//         );

//         /* -------- INSERT SPECS (JSON) -------- */
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
//           variants: {}
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
//             stockStatus:
//               Number(totalStock) > 0 ? "In Stock" : "Out of Stock",
//           },
//           { transaction: t }
//         );

//         productMap[productKey].variants[variantCode] = variant;
//       }

//       const currentVariant =
//         productMap[productKey].variants[variantCode];

//       /* ---------------- SIZE ---------------- */
//       if (size) {
//         await VariantSize.create(
//           {
//             variantId: currentVariant.id,
//             size,
//             stock: Number(sizeStock) || 0,
//             chest: chest || null,
//           },
//           { transaction: t }
//         );
//       }
//     }

//     await t.commit();

//     return res.json({
//       success: true,
//       message: "Bulk products created successfully",
//       totalProducts: Object.keys(productMap).length,
//     });
//   } catch (error) {
//     await t.rollback();

//     console.error("BULK UPLOAD ERROR:", error);

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
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantSize = require("../../models/productVariants/variantSize.model");
const generateSKU = require("../../utils/skuGenerator");

const parseJSON = (data, fieldName) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    throw new Error(`Invalid JSON format in "${fieldName}"`);
  }
};

exports.bulkCreateProductsFromExcel = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    if (!req.file) throw new Error("Excel file is required");

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (!rows.length) throw new Error("Excel sheet is empty");

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
        mrp,
        sellingPrice,
        currency,
        specs,
        variantCode,
        colorName,
        colorCode,
        colorSwatch,
        totalStock,
        length,
        diameter,
        sizeStock,
      } = row;

      if (!title || !categoryId || !subCategoryId || !productCategoryId) {
        throw new Error(`Missing required product fields for ${title}`);
      }

      const productKey = `${title}-${categoryId}-${subCategoryId}-${productCategoryId}`;

      /* ---------------- CREATE PRODUCT ONCE ---------------- */
      if (!productMap[productKey]) {
        const product = await Product.create(
          {
            title,
            brandName,
            categoryId: Number(categoryId),
            subCategoryId: Number(subCategoryId),
            productCategoryId: Number(productCategoryId),
            description,
            badge,
            gstRate: Number(gstRate) || 0,
          },
          { transaction: t },
        );
        /* ---------------- PRICE ---------------- */
        await ProductPrice.create(
          {
            productId: product.id,
            mrp: Number(mrp) || 0,
            sellingPrice: Number(sellingPrice) || 0,
            discountPercentage:
              Number(mrp) > Number(sellingPrice)
                ? Math.round(
                    ((Number(mrp) - Number(sellingPrice)) / Number(mrp)) * 100,
                  )
                : 0,
            currency: currency || "INR",
          },
          { transaction: t },
        );

        /* ---------------- SPECS ---------------- */
        if (specs) {
          const parsedSpecs = parseJSON(specs, "specs");

          const specRows = Object.keys(parsedSpecs).map((key) => ({
            productId: product.id,
            specKey: key,
            specValue: Array.isArray(parsedSpecs[key])
              ? parsedSpecs[key].join(", ")
              : parsedSpecs[key],
          }));

          if (specRows.length) {
            await ProductSpec.bulkCreate(specRows, { transaction: t });
          }
        }

        productMap[productKey] = {
          product,
          variants: {},
        };
      }

      const currentProduct = productMap[productKey].product;

      /* ---------------- VARIANT UNIQUE ---------------- */
      if (!variantCode) {
        throw new Error(`variantCode is required for product ${title}`);
      }

      if (!productMap[productKey].variants[variantCode]) {
        const variant = await ProductVariant.create(
          {
            productId: currentProduct.id,
            variantCode,
            colorName,
            colorCode,
            colorSwatch,
            totalStock: Number(totalStock) || 0,
            stockStatus: Number(totalStock) > 0 ? "In Stock" : "Out of Stock",
          },
          { transaction: t },
        );

        productMap[productKey].variants[variantCode] = variant;
      }

      const currentVariant = productMap[productKey].variants[variantCode];

      /* ---------------- SIZE ---------------- */
      if (length || diameter) {
        await VariantSize.create(
          {
            variantId: currentVariant.id,
            stock: Number(sizeStock) || 0,
            length: length || null,
            diameter: diameter || null,
          },
          { transaction: t },
        );
      }
    }

    /* ---------------- GENERATE SKU AFTER DATA INSERT ---------------- */
    for (const key of Object.keys(productMap)) {
      const p = productMap[key].product;

      const fullProduct = await Product.findByPk(p.id, {
        include: ["Category", "SubCategory", "ProductCategory"],
        transaction: t,
      });

      const generatedSku = await generateSKU(fullProduct, t);

      await p.update({ sku: generatedSku }, { transaction: t });

      productMap[key].sku = generatedSku; // optional tracking
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Bulk products created successfully",
      totalProducts: Object.keys(productMap).length,
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
