// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");
// const fs = require("fs");
// const path = require("path");

// // const cloudinary = require("../../config/cloudinary");

// /* ---------------- SAFE JSON PARSER ---------------- */
// const parseJSON = (data, field) => {
//   try {
//     return typeof data === "string" ? JSON.parse(data) : data;
//   } catch {
//     throw new Error(`Invalid JSON in "${field}"`);
//   }
// };

// exports.updateProductDetails = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { id: productId } = req.params;
//     const {
//       title,
//       brandName,
//       categoryId,
//       subCategoryId,
//       productCategoryId,
//       description,
//       badge,
//       price,
//       specs,
//       variants,
//       appliedOffers,
//       gstRate,
//     } = req.body;

//     /* ---------------- FIND PRODUCT ---------------- */
//     const product = await Product.findByPk(productId, { transaction: t });
//     if (!product) throw new Error("Product not found");

//     /* ---------------- UPDATE CORE ---------------- */
//     await product.update(
//       {
//         ...(title !== undefined && { title }),
//         ...(description !== undefined && { description }),
//         ...(badge !== undefined && { badge }),
//         ...(brandName !== undefined && { brandName }),
//         // ✅ ADD THESE
//         ...(categoryId !== undefined && { categoryId }),
//         ...(subCategoryId !== undefined && { subCategoryId }),
//         ...(productCategoryId !== undefined && { productCategoryId }),
//         ...(gstRate !== undefined && {
//           gstRate: isNaN(Number(gstRate))
//             ? (() => {
//                 throw new Error("Invalid GST rate");
//               })()
//             : Number(gstRate),
//         }),
//         // ...(isActive !== undefined && { isActive }),
//       },
//       { transaction: t },
//     );

//     /* ---------------- PRICE UPSERT ---------------- */
//     if (price) {
//       const p = parseJSON(price, "price");

//       const mrp = Number(p.mrp);
//       const sellingPrice = Number(p.sellingPrice ?? mrp);

//       await ProductPrice.upsert(
//         {
//           productId,
//           mrp,
//           sellingPrice,
//           discountPercentage:
//             mrp > sellingPrice
//               ? Math.round(((mrp - sellingPrice) / mrp) * 100)
//               : 0,
//           currency: p.currency || "INR",
//         },
//         { transaction: t },
//       );
//     }

//     /* ---------------- SPECS REPLACE ---------------- */
//     if (specs) {
//       const parsedSpecs = parseJSON(specs, "specs");

//       await ProductSpec.destroy({ where: { productId }, transaction: t });

//       const rows = Object.keys(parsedSpecs).map((key) => ({
//         productId,
//         specKey: key,
//         specValue: Array.isArray(parsedSpecs[key])
//           ? parsedSpecs[key].join(", ")
//           : parsedSpecs[key],
//       }));

//       if (rows.length) await ProductSpec.bulkCreate(rows, { transaction: t });
//     }

//     /* ================= MAP UPLOADED CLOUDINARY IMAGES ================= */
//     const variantImagesMap = {};

//     for (const file of req.files || []) {
//       let match;

//       // existing variant images
//       match = file.fieldname.match(/^variantImages_id_(\d+)$/);
//       if (match) {
//         const key = `id_${match[1]}`;
//         variantImagesMap[key] ??= [];
//         const imagePath = `/uploads/products/${file.filename}`;
//         variantImagesMap[key].push(imagePath);
//         continue;
//       }

//       // new variant images
//       match = file.fieldname.match(/^variantImages_tmp_(.+)$/);
//       if (match) {
//         const key = `tmp_${match[1]}`;
//         variantImagesMap[key] ??= [];
//         const imagePath = `/uploads/products/${file.filename}`;
//         variantImagesMap[key].push(imagePath);
//       }
//     }

//     /* ================= VARIANTS ================= */
//     if (variants) {
//       const parsedVariants = parseJSON(variants, "variants");

//       const dbVariants = await ProductVariant.findAll({
//         where: { productId },
//         include: [{ model: VariantImage, as: "images" }],
//         transaction: t,
//       });

//       const dbMap = new Map(dbVariants.map((v) => [v.id, v]));
//       const incomingIds = new Set();

//       for (const v of parsedVariants) {
//         let variant;

//         /* ---------- UPDATE EXISTING VARIANT ---------- */
//         if (v.id) {
//           if (!dbMap.has(v.id)) throw new Error(`Invalid variant id ${v.id}`);

//           variant = dbMap.get(v.id);
//           incomingIds.add(variant.id);
//           const calculatedTotalStock = Array.isArray(v.sizes)
//             ? v.sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0)
//             : 0;

//           await variant.update(
//             {
//               variantCode: v.variantCode,
//               colorName: v.color.name,
//               colorCode: v.color.code,
//               colorSwatch: v.color.swatch ?? null,
//               totalStock: calculatedTotalStock,
//               stockStatus:
//                 calculatedTotalStock > 0 ? "In Stock" : "Out of Stock",
//               isActive: v.isActive,
//             },
//             { transaction: t },
//           );

//           /* ---------- REPLACE SIZES ---------- */
//           if (Array.isArray(v.sizes)) {
//             await VariantSize.destroy({
//               where: { variantId: variant.id },
//               transaction: t,
//             });

//             await VariantSize.bulkCreate(
//               v.sizes.map((s) => ({
//                 variantId: variant.id,
//                 diameter: Number(s.diameter),
//                 length: Number(s.length),
//                 stock: Number(s.stock) || 0,
//               })),
//               { transaction: t },
//             );
//           }

//           /* ---------- REPLACE IMAGES ---------- */
//           const newImgs = variantImagesMap[`id_${variant.id}`] || [];

//           if (newImgs.length > 0) {
//             for (const img of variant.images) {
//               const fullPath = path.join(__dirname, "../../", img.imageUrl);
//               if (fs.existsSync(fullPath)) {
//                 fs.unlinkSync(fullPath);
//               }
//             }

//             await VariantImage.destroy({
//               where: { variantId: variant.id },
//               transaction: t,
//             });

//             await VariantImage.bulkCreate(
//               newImgs.map((url) => ({
//                 variantId: variant.id,
//                 imageUrl: url,
//               })),
//               { transaction: t },
//             );
//           }
//         } else {
//           /* ---------- CREATE NEW VARIANT ---------- */
//           if (!v.tempKey) throw new Error("tempKey required for new variant");

//           const calculatedTotalStock = Array.isArray(v.sizes)
//             ? v.sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0)
//             : 0;

//           variant = await ProductVariant.create(
//             {
//               productId,
//               variantCode: v.variantCode,
//               colorName: v.color.name,
//               colorCode: v.color.code,
//               colorSwatch: v.color.swatch ?? null,
//               totalStock: calculatedTotalStock,
//               stockStatus:
//                 calculatedTotalStock > 0 ? "In Stock" : "Out of Stock",
//             },
//             { transaction: t },
//           );

//           incomingIds.add(variant.id);

//           /* sizes */
//           if (Array.isArray(v.sizes)) {
//             await VariantSize.bulkCreate(
//               v.sizes.map((s) => ({
//                 variantId: variant.id,
//                 diameter: Number(s.diameter),
//                 length: Number(s.length),
//                 stock: Number(s.stock) || 0,
//               })),
//               { transaction: t },
//             );
//           }

//           /* images */
//           const imgs = variantImagesMap[`tmp_${v.tempKey}`] || [];
//           if (imgs.length) {
//             await VariantImage.bulkCreate(
//               imgs.map((url) => ({
//                 variantId: variant.id,
//                 imageUrl: url,
//               })),
//               { transaction: t },
//             );
//           }
//         }
//       }

//       /* ---------- DELETE REMOVED VARIANTS ---------- */
//       const toDelete = dbVariants.filter((v) => !incomingIds.has(v.id));

//       for (const v of toDelete) {
//         // delete cloudinary images
//         for (const img of v.images) {
//           const fullPath = path.join(__dirname, "../../", img.imageUrl);
//           if (fs.existsSync(fullPath)) {
//             fs.unlinkSync(fullPath);
//           }
//         }
//       }

//       await VariantSize.destroy({
//         where: { variantId: toDelete.map((v) => v.id) },
//         transaction: t,
//       });

//       await VariantImage.destroy({
//         where: { variantId: toDelete.map((v) => v.id) },
//         transaction: t,
//       });

//       await ProductVariant.destroy({
//         where: { id: toDelete.map((v) => v.id) },
//         transaction: t,
//       });
//     }

//     /* ---------------- UPDATE OFFERS ---------------- */
//     if (appliedOffers) {
//       const parsedAppliedOffers = parseJSON(appliedOffers, "appliedOffers");

//       await OfferApplicableProduct.destroy({
//         where: { productId: id },
//         transaction: t,
//       });

//       if (parsedAppliedOffers.length) {
//         await OfferApplicableProduct.bulkCreate(
//           parsedAppliedOffers.map((o) => ({
//             productId: id,
//             offerId: o.offerId,
//             subOfferId: o.subOfferId,
//           })),
//           { transaction: t },
//         );
//       }
//     }

//     await t.commit();

//     return res.json({
//       success: true,
//       message: "Product updated successfully",
//     });
//   } catch (error) {
//     await t.rollback();
//     console.error("UPDATE PRODUCT ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };








// const sequelize = require("../../config/db");
// const { ValidationError } = require("sequelize");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");
// const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");
// const fs = require("fs");
// const priceService = require("../../services/price.service");
// const path = require("path");

// /* ---------------- SAFE JSON PARSER ---------------- */
// const parseJSON = (data, fieldName) => {
//   try {
//     if (data === undefined || data === null) {
//       return fieldName === "specs"
//         ? {}
//         : fieldName === "appliedOffers"
//           ? []
//           : fieldName === "variants"
//             ? []
//             : null;
//     }
//     return typeof data === "string" ? JSON.parse(data) : data;
//   } catch (error) {
//     throw new Error(`Invalid JSON format in "${fieldName}": ${error.message}`);
//   }
// };

// /* ---------------- VALIDATION HELPERS ---------------- */
// const validateRequired = (value, fieldName) => {
//   if (value === undefined || value === null) {
//     throw new Error(`${fieldName} is required`);
//   }
//   return value;
// };

// const validateNumber = (value, fieldName, options = {}) => {
//   const { min, max, isInteger = false, required = false } = options;

//   if (value === undefined || value === null) {
//     if (required) throw new Error(`${fieldName} is required`);
//     return value;
//   }

//   const num = Number(value);
//   if (isNaN(num)) {
//     throw new Error(`${fieldName} must be a valid number`);
//   }

//   if (isInteger && !Number.isInteger(num)) {
//     throw new Error(`${fieldName} must be an integer`);
//   }

//   if (min !== undefined && num < min) {
//     throw new Error(`${fieldName} must be at least ${min}`);
//   }

//   if (max !== undefined && num > max) {
//     throw new Error(`${fieldName} must be at most ${max}`);
//   }

//   return num;
// };

// const validateString = (value, fieldName, options = {}) => {
//   const {
//     minLength = 1,
//     maxLength,
//     pattern,
//     patternMessage,
//     required = false,
//   } = options;

//   if (value === undefined || value === null) {
//     if (required) throw new Error(`${fieldName} is required`);
//     return value;
//   }

//   if (typeof value !== "string") {
//     throw new Error(`${fieldName} must be a string`);
//   }

//   const trimmed = value.trim();

//   if (required && trimmed.length === 0) {
//     throw new Error(`${fieldName} cannot be empty`);
//   }

//   if (trimmed.length < minLength) {
//     throw new Error(`${fieldName} must be at least ${minLength} character(s)`);
//   }

//   if (maxLength && trimmed.length > maxLength) {
//     throw new Error(`${fieldName} must be at most ${maxLength} character(s)`);
//   }

//   if (pattern && !pattern.test(trimmed)) {
//     throw new Error(patternMessage || `${fieldName} has invalid format`);
//   }

//   return trimmed;
// };

// const validateArray = (value, fieldName, options = {}) => {
//   const { minLength = 0, maxLength, itemValidator, required = false } = options;

//   if (value === undefined || value === null) {
//     if (required) throw new Error(`${fieldName} is required`);
//     return value;
//   }

//   if (!Array.isArray(value)) {
//     throw new Error(`${fieldName} must be an array`);
//   }

//   if (value.length < minLength) {
//     throw new Error(`${fieldName} must have at least ${minLength} item(s)`);
//   }

//   if (maxLength && value.length > maxLength) {
//     throw new Error(`${fieldName} must have at most ${maxLength} item(s)`);
//   }

//   if (itemValidator) {
//     value.forEach((item, index) => {
//       try {
//         itemValidator(item, `${fieldName}[${index}]`);
//       } catch (error) {
//         throw new Error(`${error.message}`);
//       }
//     });
//   }

//   return value;
// };

// /* ---------------- MAIN FUNCTION ---------------- */
// exports.updateProductDetails = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { id: productId } = req.params;
//     console.log("FILES RECEIVED FOR UPDATE:", req.files); // 🔥 debug

//     const {
//       title,
//       brandName,
//       categoryId,
//       subCategoryId,
//       productCategoryId,
//       description,
//       badge,
//       price,
//       specs,
//       variants,
//       appliedOffers,
//       gstRate,
//     } = req.body;

//     /* ---------------- FIND PRODUCT ---------------- */
//     const product = await Product.findByPk(productId, { transaction: t });
//     if (!product) throw new Error("Product not found");

//     /* ---------------- VALIDATE & UPDATE CORE FIELDS ---------------- */
//     const updateData = {};

//     if (title !== undefined) {
//       updateData.title = validateString(title, "title", {
//         minLength: 3,
//         maxLength: 200,
//         required: true,
//       });
//     }

//     if (brandName !== undefined) {
//       updateData.brandName = validateString(brandName, "brandName", {
//         minLength: 1,
//         maxLength: 100,
//         required: false,
//       });
//     }

//     if (categoryId !== undefined) {
//       updateData.categoryId = validateNumber(categoryId, "categoryId", {
//         required: true,
//         isInteger: true,
//         min: 1,
//       });
//     }

//     if (subCategoryId !== undefined) {
//       updateData.subCategoryId = validateNumber(
//         subCategoryId,
//         "subCategoryId",
//         {
//           required: true,
//           isInteger: true,
//           min: 1,
//         },
//       );
//     }

//     if (productCategoryId !== undefined) {
//       updateData.productCategoryId = validateNumber(
//         productCategoryId,
//         "productCategoryId",
//         {
//           required: true,
//           isInteger: true,
//           min: 1,
//         },
//       );
//     }

//     if (description !== undefined) {
//       updateData.description = validateString(description, "description", {
//         minLength: 0,
//         maxLength: 2000,
//         required: false,
//       });
//     }

//     if (badge !== undefined) {
//       updateData.badge = validateString(badge, "badge", {
//         minLength: 0,
//         maxLength: 50,
//         required: false,
//       });
//     }

//     if (gstRate !== undefined) {
//       updateData.gstRate = validateNumber(gstRate, "gstRate", {
//         required: true,
//         min: 0,
//         max: 100,
//       });
//     }

//     if (Object.keys(updateData).length > 0) {
//       await product.update(updateData, { transaction: t });
//     }

//     /* ---------------- PRICE UPDATE ---------------- */
//     if (price) {
//       const p = parseJSON(price, "price");

//       if (!p.mrp) {
//         throw new Error("MRP is required in price");
//       }

//       const mrp = validateNumber(p.mrp, "price.mrp", {
//         required: true,
//         min: 0.01,
//       });

//       let sellingPrice;
//       if (p.sellingPrice !== undefined) {
//         sellingPrice = validateNumber(p.sellingPrice, "price.sellingPrice", {
//           min: 0.01,
//         });
//         if (sellingPrice > mrp) {
//           throw new Error("Selling price cannot be greater than MRP");
//         }
//       } else {
//         sellingPrice = mrp;
//       }

//       const discountPercentage =
//         mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

//       const currency =
//         validateString(p.currency, "price.currency", {
//           minLength: 3,
//           maxLength: 3,
//           pattern: /^[A-Z]{3}$/,
//           patternMessage:
//             "Currency must be a 3-letter ISO code (e.g., INR, USD)",
//           required: false,
//         }) || "INR";

//       // ✅ INSTEAD, update price for each variant
//       // Get all variants for this product
//       const variants = await ProductVariant.findAll({
//         where: { productId },
//         transaction: t,
//       });

//       for (const variant of variants) {
//         await ProductPrice.upsert(
//           {
//             variantId: variant.id, // Use variantId, not productId
//             mrp,
//             sellingPrice,
//             discountPercentage,
//             currency,
//           },
//           { transaction: t },
//         );
//       }
//     }

//     /* ---------------- SPECS REPLACE ---------------- */
//     if (specs !== undefined) {
//       const parsedSpecs = parseJSON(specs, "specs");

//       // Validate specs
//       if (parsedSpecs && typeof parsedSpecs === "object") {
//         Object.entries(parsedSpecs).forEach(([key, value]) => {
//           validateString(key, "spec key", { minLength: 1, maxLength: 100 });
//           if (value !== null && value !== undefined) {
//             const stringValue = String(value);
//             if (stringValue.length > 500) {
//               throw new Error(
//                 `Spec value for "${key}" exceeds maximum length of 500 characters`,
//               );
//             }
//           }
//         });
//       }

//       await ProductSpec.destroy({ where: { productId }, transaction: t });

//       if (Object.keys(parsedSpecs).length > 0) {
//         const rows = Object.keys(parsedSpecs).map((key) => ({
//           productId,
//           specKey: key,
//           specValue: Array.isArray(parsedSpecs[key])
//             ? parsedSpecs[key].join(", ")
//             : String(parsedSpecs[key]),
//         }));

//         await ProductSpec.bulkCreate(rows, { transaction: t });
//       }
//     }

//     /* ================= MAP UPLOADED IMAGES ================= */
//     const variantImagesMap = {};

//     for (const file of req.files || []) {
//       let match;

//       // existing variant images
//       match = file.fieldname.match(/^variantImages_id_(\d+)$/);
//       if (match) {
//         const key = `id_${match[1]}`;
//         variantImagesMap[key] ??= [];
//         const imagePath = `/uploads/products/${file.filename}`;
//         variantImagesMap[key].push(imagePath);
//         continue;
//       }

//       // new variant images
//       match = file.fieldname.match(/^variantImages_tmp_(.+)$/);
//       if (match) {
//         const key = `tmp_${match[1]}`;
//         variantImagesMap[key] ??= [];
//         const imagePath = `/uploads/products/${file.filename}`;
//         variantImagesMap[key].push(imagePath);
//       }
//     }

//     /* ================= VARIANTS ================= */
//     if (variants !== undefined) {
//       const parsedVariants = parseJSON(variants, "variants");

//       // Validate variants array
//       validateArray(parsedVariants, "variants", { minLength: 1 });

//       // Check for duplicate variant codes
//       const variantCodes = parsedVariants
//         .map((v) => v.variantCode)
//         .filter(Boolean);
//       const duplicateCodes = variantCodes.filter(
//         (code, index) => variantCodes.indexOf(code) !== index,
//       );
//       if (duplicateCodes.length > 0) {
//         throw new Error(
//           `Duplicate variant codes found: ${duplicateCodes.join(", ")}`,
//         );
//       }

//       const dbVariants = await ProductVariant.findAll({
//         where: { productId },
//         include: [{ model: VariantImage, as: "images" }],
//         transaction: t,
//       });

//       const dbMap = new Map(dbVariants.map((v) => [v.id, v]));
//       const incomingIds = new Set();

//       for (let i = 0; i < parsedVariants.length; i++) {
//         const v = parsedVariants[i];
//         const variantIndex = i;
//         let variant;

//         try {
//           // Validate common variant fields
//           const validatedVariantCode = validateString(
//             v.variantCode,
//             `variants[${variantIndex}].variantCode`,
//             {
//               minLength: 1,
//               maxLength: 50,
//               required: true,
//               pattern: /^[A-Za-z0-9_-]+$/,
//               patternMessage:
//                 "Variant code must contain only letters, numbers, underscores and hyphens",
//             },
//           );

//           // Validate color fields
//           if (v.color) {
//             validateString(
//               v.color.name,
//               `variants[${variantIndex}].color.name`,
//               {
//                 maxLength: 50,
//                 required: false,
//               },
//             );
//             validateString(
//               v.color.code,
//               `variants[${variantIndex}].color.code`,
//               {
//                 maxLength: 20,
//                 required: false,
//               },
//             );
//           }

//           // Calculate total stock from sizes
//           let calculatedTotalStock = 0;
//           if (Array.isArray(v.sizes) && v.sizes.length > 0) {
//             calculatedTotalStock = v.sizes.reduce((sum, s) => {
//               const stock = validateNumber(
//                 s.stock,
//                 `variants[${variantIndex}].sizes stock`,
//                 { isInteger: true, min: 0, required: true },
//               );
//               return sum + (stock || 0);
//             }, 0);
//           }

//           // Validate stock status
//           const validStockStatuses = [
//             "In Stock",
//             "Out of Stock",
//             "Pre-Order",
//             "Discontinued",
//           ];
//           if (v.stockStatus && !validStockStatuses.includes(v.stockStatus)) {
//             throw new Error(
//               `variants[${variantIndex}].stockStatus must be one of: ${validStockStatuses.join(", ")}`,
//             );
//           }

//           /* ---------- UPDATE EXISTING VARIANT ---------- */
//           if (v.id) {
//             if (!dbMap.has(v.id)) throw new Error(`Invalid variant id ${v.id}`);

//             variant = dbMap.get(v.id);
//             incomingIds.add(variant.id);

//             await variant.update(
//               {
//                 variantCode: validatedVariantCode,
//                 colorName: v.color?.name,
//                 colorCode: v.color?.code,
//                 colorSwatch: v.color?.swatch ?? null,
//                 totalStock: calculatedTotalStock,
//                 stockStatus:
//                   v.stockStatus ||
//                   (calculatedTotalStock > 0 ? "In Stock" : "Out of Stock"),
//                 isActive: v.isActive !== undefined ? v.isActive : true,
//               },
//               { transaction: t },
//             );

//             /* ---------- REPLACE SIZES ---------- */
//             if (Array.isArray(v.sizes)) {
//               // Validate each size
//               v.sizes.forEach((s, sizeIndex) => {
//                 if (!s.length && !s.diameter) {
//                   throw new Error(
//                     `Either length or diameter must be provided for size at index ${sizeIndex} in variant ${variantIndex}`,
//                   );
//                 }
//                 validateNumber(
//                   s.diameter,
//                   `variants[${variantIndex}].sizes[${sizeIndex}].diameter`,
//                   {
//                     min: 0,
//                     required: false,
//                   },
//                 );
//                 validateNumber(
//                   s.length,
//                   `variants[${variantIndex}].sizes[${sizeIndex}].length`,
//                   {
//                     min: 0,
//                     required: false,
//                   },
//                 );
//                 validateNumber(
//                   s.stock,
//                   `variants[${variantIndex}].sizes[${sizeIndex}].stock`,
//                   {
//                     required: true,
//                     isInteger: true,
//                     min: 0,
//                   },
//                 );
//               });

//               await VariantSize.destroy({
//                 where: { variantId: variant.id },
//                 transaction: t,
//               });

//               await VariantSize.bulkCreate(
//                 v.sizes.map((s) => ({
//                   variantId: variant.id,
//                   diameter: s.diameter ? Number(s.diameter) : null,
//                   length: s.length ? Number(s.length) : null,
//                   stock: Number(s.stock) || 0,
//                 })),
//                 { transaction: t },
//               );
//             }

//             /* ---------- REPLACE IMAGES ---------- */
//             const newImgs = variantImagesMap[`id_${variant.id}`] || [];

//             if (newImgs.length > 0) {
//               // Delete old images
//               for (const img of variant.images) {
//                 const fullPath = path.join(__dirname, "../../", img.imageUrl);
//                 if (fs.existsSync(fullPath)) {
//                   fs.unlinkSync(fullPath);
//                 }
//               }

//               await VariantImage.destroy({
//                 where: { variantId: variant.id },
//                 transaction: t,
//               });

//               // Validate max images (5)
//               if (newImgs.length > 5) {
//                 throw new Error(
//                   `Max 5 images allowed for variant ${variantIndex}`,
//                 );
//               }

//               await VariantImage.bulkCreate(
//                 newImgs.map((url, imgIndex) => ({
//                   variantId: variant.id,
//                   imageUrl: url,
//                   isPrimary: imgIndex === 0,
//                 })),
//                 { transaction: t },
//               );
//             }
//           } else {
//             /* ---------- CREATE NEW VARIANT ---------- */
//             if (!v.tempKey) throw new Error("tempKey required for new variant");

//             await variant.update(
//               {
//                 variantCode: validatedVariantCode,

//                 packQuantity: v.packQuantity ?? null,
//                 finish: v.finish ?? null,
//                 grade: v.grade ?? null,
//                 material: v.material ?? null,
//                 threadType: v.threadType ?? null,

//                 colorName: v.color?.name,
//                 colorCode: v.color?.code,
//                 colorSwatch: v.color?.swatch ?? null,

//                 totalStock: calculatedTotalStock,

//                 stockStatus:
//                   v.stockStatus ||
//                   (calculatedTotalStock > 0 ? "In Stock" : "Out of Stock"),

//                 isActive: v.isActive !== undefined ? v.isActive : true,
//               },
//               { transaction: t },
//             );

//             incomingIds.add(variant.id);

//             /* ---------- CREATE SIZES ---------- */
//             if (Array.isArray(v.sizes) && v.sizes.length > 0) {
//               // Validate each size
//               v.sizes.forEach((s, sizeIndex) => {
//                 if (!s.length && !s.diameter) {
//                   throw new Error(
//                     `Either length or diameter must be provided for size at index ${sizeIndex} in variant ${variantIndex}`,
//                   );
//                 }
//                 validateNumber(
//                   s.diameter,
//                   `variants[${variantIndex}].sizes[${sizeIndex}].diameter`,
//                   {
//                     min: 0,
//                     required: false,
//                   },
//                 );
//                 validateNumber(
//                   s.length,
//                   `variants[${variantIndex}].sizes[${sizeIndex}].length`,
//                   {
//                     min: 0,
//                     required: false,
//                   },
//                 );
//                 validateNumber(
//                   s.stock,
//                   `variants[${variantIndex}].sizes[${sizeIndex}].stock`,
//                   {
//                     required: true,
//                     isInteger: true,
//                     min: 0,
//                   },
//                 );
//               });

//               await VariantSize.bulkCreate(
//                 v.sizes.map((s) => ({
//                   variantId: variant.id,
//                   diameter: s.diameter ? Number(s.diameter) : null,
//                   length: s.length ? Number(s.length) : null,
//                   stock: Number(s.stock) || 0,
//                 })),
//                 { transaction: t },
//               );
//             }

//             /* ---------- CREATE IMAGES ---------- */
//             const imgs = variantImagesMap[`tmp_${v.tempKey}`] || [];
//             if (imgs.length > 0) {
//               if (imgs.length > 5) {
//                 throw new Error(
//                   `Max 5 images allowed for variant ${variantIndex}`,
//                 );
//               }

//               await VariantImage.bulkCreate(
//                 imgs.map((url, imgIndex) => ({
//                   variantId: variant.id,
//                   imageUrl: url,
//                   isPrimary: imgIndex === 0,
//                 })),
//                 { transaction: t },
//               );
//             }
//           }

//           // Verify total stock matches sizes
//           if (Array.isArray(v.sizes) && v.sizes.length > 0) {
//             const sizes = await VariantSize.findAll({
//               where: { variantId: variant.id },
//               transaction: t,
//             });
//             const totalSizeStock = sizes.reduce(
//               (sum, size) => sum + size.stock,
//               0,
//             );
//             if (totalSizeStock !== variant.totalStock) {
//               throw new Error(
//                 `Total stock (${variant.totalStock}) for variant ${variant.variantCode} does not match sum of size stocks (${totalSizeStock})`,
//               );
//             }
//           }
//         } catch (error) {
//           throw new Error(
//             `Variant ${variantIndex} validation failed: ${error.message}`,
//           );
//         }
//       }

//       /* ---------- DELETE REMOVED VARIANTS ---------- */
//       const toDelete = dbVariants.filter((v) => !incomingIds.has(v.id));

//       if (toDelete.length > 0) {
//         // Delete images
//         for (const v of toDelete) {
//           for (const img of v.images) {
//             const fullPath = path.join(__dirname, "../../", img.imageUrl);
//             if (fs.existsSync(fullPath)) {
//               fs.unlinkSync(fullPath);
//             }
//           }
//         }

//         await VariantSize.destroy({
//           where: { variantId: toDelete.map((v) => v.id) },
//           transaction: t,
//         });

//         await VariantImage.destroy({
//           where: { variantId: toDelete.map((v) => v.id) },
//           transaction: t,
//         });

//         await ProductVariant.destroy({
//           where: { id: toDelete.map((v) => v.id) },
//           transaction: t,
//         });
//       }
//     }

//     /* ---------------- UPDATE OFFERS ---------------- */
//     if (appliedOffers !== undefined) {
//       const parsedAppliedOffers = parseJSON(appliedOffers, "appliedOffers");

//       // Validate offers
//       if (parsedAppliedOffers && parsedAppliedOffers.length > 0) {
//         validateArray(parsedAppliedOffers, "appliedOffers");

//         parsedAppliedOffers.forEach((offer, index) => {
//           if (!offer.offerId) {
//             throw new Error(
//               `offerId is required for appliedOffer at index ${index}`,
//             );
//           }
//           validateNumber(offer.offerId, `appliedOffers[${index}].offerId`, {
//             required: true,
//             isInteger: true,
//             min: 1,
//           });

//           if (offer.subOfferId) {
//             validateNumber(
//               offer.subOfferId,
//               `appliedOffers[${index}].subOfferId`,
//               {
//                 isInteger: true,
//                 min: 1,
//               },
//             );
//           }
//         });
//       }

//       await OfferApplicableProduct.destroy({
//         where: { productId },
//         transaction: t,
//       });

//       if (parsedAppliedOffers && parsedAppliedOffers.length > 0) {
//         await OfferApplicableProduct.bulkCreate(
//           parsedAppliedOffers.map((o) => ({
//             productId,
//             offerId: o.offerId,
//             subOfferId: o.subOfferId,
//           })),
//           { transaction: t, validate: true },
//         );
//       }
//     }

//     await t.commit();

//     return res.json({
//       success: true,
//       message: "Product updated successfully",
//     });
//   } catch (error) {
//     if (t && !t.finished) {
//       await t.rollback();
//     }

//     console.error("UPDATE PRODUCT ERROR:", error);

//     // Handle Sequelize validation errors
//     if (error instanceof ValidationError) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation error",
//         errors: error.errors.map((e) => ({
//           field: e.path,
//           message: e.message,
//         })),
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: error.message || "Product update failed",
//     });
//   }
// };






const sequelize = require("../../config/db");
const { ValidationError } = require("sequelize");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const VariantSize = require("../../models/productVariants/variantSize.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");
const StoreInventory = require("../../models/products/StoreInventory.model");
const fs = require("fs");
const priceService = require("../../services/price.service");
const path = require("path");

/* ---------------- SAFE JSON PARSER ---------------- */
const parseJSON = (data, fieldName) => {
  try {
    if (data === undefined || data === null) {
      return fieldName === "specs"
        ? {}
        : fieldName === "appliedOffers"
          ? []
          : fieldName === "variants"
            ? []
            : null;
    }
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (error) {
    throw new Error(`Invalid JSON format in "${fieldName}": ${error.message}`);
  }
};

/* ---------------- VALIDATION HELPERS ---------------- */
const validateRequired = (value, fieldName) => {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  return value;
};

const validateNumber = (value, fieldName, options = {}) => {
  const { min, max, isInteger = false, required = false } = options;

  if (value === undefined || value === null) {
    if (required) throw new Error(`${fieldName} is required`);
    return value;
  }

  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (isInteger && !Number.isInteger(num)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  if (min !== undefined && num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }

  return num;
};

const validateString = (value, fieldName, options = {}) => {
  const {
    minLength = 1,
    maxLength,
    pattern,
    patternMessage,
    required = false,
  } = options;

  if (value === undefined || value === null) {
    if (required) throw new Error(`${fieldName} is required`);
    return value;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (required && trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }

  if (trimmed.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} character(s)`);
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} character(s)`);
  }

  if (pattern && !pattern.test(trimmed)) {
    throw new Error(patternMessage || `${fieldName} has invalid format`);
  }

  return trimmed;
};

const validateArray = (value, fieldName, options = {}) => {
  const { minLength = 0, maxLength, itemValidator, required = false } = options;

  if (value === undefined || value === null) {
    if (required) throw new Error(`${fieldName} is required`);
    return value;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }

  if (value.length < minLength) {
    throw new Error(`${fieldName} must have at least ${minLength} item(s)`);
  }

  if (maxLength && value.length > maxLength) {
    throw new Error(`${fieldName} must have at most ${maxLength} item(s)`);
  }

  if (itemValidator) {
    value.forEach((item, index) => {
      try {
        itemValidator(item, `${fieldName}[${index}]`);
      } catch (error) {
        throw new Error(`${error.message}`);
      }
    });
  }

  return value;
};

/* ---------------- HELPER FUNCTION TO UPDATE VARIANT STOCK FROM INVENTORY ---------------- */
const updateVariantStockFromInventory = async (variantId, transaction) => {
  try {
    // First, get all size IDs for this variant
    const variantSizes = await VariantSize.findAll({
      where: { variantId },
      attributes: ['id'],
      transaction,
    });
    
    const sizeIds = variantSizes.map(size => size.id);
    
    let totalStock = 0;
    
    // If there are sizes, sum stock across all inventory records for these sizes
    if (sizeIds.length > 0) {
      totalStock = await StoreInventory.sum("stock", {
        where: { 
          variantSizeId: sizeIds 
        },
        transaction,
      });
    }
    
    // Update variant total stock and status
    await ProductVariant.update(
      {
        totalStock: totalStock || 0,
        stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",
      },
      {
        where: { id: variantId },
        transaction,
      }
    );
    
    console.log(`Updated variant ${variantId}: totalStock = ${totalStock || 0}, stockStatus = ${totalStock > 0 ? "In Stock" : "Out of Stock"}`);
    console.log(`Size IDs found: ${sizeIds.join(', ')}`);
    
    return totalStock || 0;
  } catch (error) {
    console.error(`Error updating variant stock for variant ${variantId}:`, error);
    throw error;
  }
};

/* ---------------- HELPER FUNCTION TO CHECK IF SIZES MATCH ---------------- */
const doSizesMatch = (size1, size2, ignoreWeight = false) => {
  const diameterMatch = (size1.diameter === size2.diameter || 
                         (size1.diameter === null && size2.diameter === null));
  const lengthMatch = (size1.length === size2.length || 
                       (size1.length === null && size2.length === null));
  
  if (ignoreWeight) {
    return diameterMatch && lengthMatch;
  }
  
  const weightMatch = (size1.approxWeightKg === size2.approxWeightKg || 
                       (size1.approxWeightKg === null && size2.approxWeightKg === null));
  
  return diameterMatch && lengthMatch && weightMatch;
};

/* ---------------- MAIN FUNCTION ---------------- */
exports.updateProductDetails = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id: productId } = req.params;
    console.log("FILES RECEIVED FOR UPDATE:", req.files);

    const {
      title,
      brandName,
      categoryId,
      subCategoryId,
      productCategoryId,
      description,
      badge,
      price,
      specs,
      variants,
      appliedOffers,
      gstRate,
    } = req.body;

    /* ---------------- FIND PRODUCT ---------------- */
    const product = await Product.findByPk(productId, { transaction: t });
    if (!product) throw new Error("Product not found");

    /* ---------------- VALIDATE & UPDATE CORE FIELDS ---------------- */
    const updateData = {};

    if (title !== undefined) {
      updateData.title = validateString(title, "title", {
        minLength: 3,
        maxLength: 200,
        required: true,
      });
    }

    if (brandName !== undefined) {
      updateData.brandName = validateString(brandName, "brandName", {
        minLength: 1,
        maxLength: 100,
        required: false,
      });
    }

    if (categoryId !== undefined) {
      updateData.categoryId = validateNumber(categoryId, "categoryId", {
        required: true,
        isInteger: true,
        min: 1,
      });
    }

    if (subCategoryId !== undefined) {
      updateData.subCategoryId = validateNumber(
        subCategoryId,
        "subCategoryId",
        {
          required: true,
          isInteger: true,
          min: 1,
        },
      );
    }

    if (productCategoryId !== undefined) {
      updateData.productCategoryId = validateNumber(
        productCategoryId,
        "productCategoryId",
        {
          required: true,
          isInteger: true,
          min: 1,
        },
      );
    }

    if (description !== undefined) {
      updateData.description = validateString(description, "description", {
        minLength: 0,
        maxLength: 2000,
        required: false,
      });
    }

    if (badge !== undefined) {
      updateData.badge = validateString(badge, "badge", {
        minLength: 0,
        maxLength: 50,
        required: false,
      });
    }

    if (gstRate !== undefined) {
      updateData.gstRate = validateNumber(gstRate, "gstRate", {
        required: true,
        min: 0,
        max: 100,
      });
    }

    if (Object.keys(updateData).length > 0) {
      await product.update(updateData, { transaction: t });
    }

    /* ---------------- SPECS REPLACE ---------------- */
    if (specs !== undefined) {
      const parsedSpecs = parseJSON(specs, "specs");

      // Validate specs
      if (parsedSpecs && typeof parsedSpecs === "object") {
        Object.entries(parsedSpecs).forEach(([key, value]) => {
          validateString(key, "spec key", { minLength: 1, maxLength: 100 });
          if (value !== null && value !== undefined) {
            const stringValue = String(value);
            if (stringValue.length > 500) {
              throw new Error(
                `Spec value for "${key}" exceeds maximum length of 500 characters`,
              );
            }
          }
        });
      }

      await ProductSpec.destroy({ where: { productId }, transaction: t });

      if (Object.keys(parsedSpecs).length > 0) {
        const rows = Object.keys(parsedSpecs).map((key) => ({
          productId,
          specKey: key,
          specValue: Array.isArray(parsedSpecs[key])
            ? parsedSpecs[key].join(", ")
            : String(parsedSpecs[key]),
        }));

        await ProductSpec.bulkCreate(rows, { transaction: t });
      }
    }

    /* ================= MAP UPLOADED IMAGES ================= */
    const variantImagesMap = {};

    for (const file of req.files || []) {
      let match;

      // existing variant images
      match = file.fieldname.match(/^variantImages_id_(\d+)$/);
      if (match) {
        const key = `id_${match[1]}`;
        variantImagesMap[key] ??= [];
        const imagePath = `/uploads/products/${file.filename}`;
        variantImagesMap[key].push(imagePath);
        continue;
      }

      // new variant images
      match = file.fieldname.match(/^variantImages_tmp_(.+)$/);
      if (match) {
        const key = `tmp_${match[1]}`;
        variantImagesMap[key] ??= [];
        const imagePath = `/uploads/products/${file.filename}`;
        variantImagesMap[key].push(imagePath);
      }
    }

    /* ================= VARIANTS ================= */
    if (variants !== undefined) {
      const parsedVariants = parseJSON(variants, "variants");

      // Validate variants array
      validateArray(parsedVariants, "variants", { minLength: 1 });

      const dbVariants = await ProductVariant.findAll({
        where: { productId },
        include: [{ model: VariantImage, as: "images" }],
        transaction: t,
      });

      const dbMap = new Map(dbVariants.map((v) => [v.id, v]));
      const incomingIds = new Set();

      for (let i = 0; i < parsedVariants.length; i++) {
        const v = parsedVariants[i];
        const variantIndex = i;
        let variant;

        try {
          // Validate common variant fields
          const validatedVariantCode = validateString(
            v.variantCode,
            `variants[${variantIndex}].variantCode`,
            {
              minLength: 1,
              maxLength: 50,
              required: true,
              pattern: /^[A-Za-z0-9_-]+$/,
              patternMessage:
                "Variant code must contain only letters, numbers, underscores and hyphens",
            },
          );

          // Validate pack quantity
          const validatedPackQuantity = validateNumber(
            v.packQuantity,
            `variants[${variantIndex}].packQuantity`,
            {
              required: false,
              isInteger: true,
              min: 1,
            },
          );

          // Validate finish
          const validatedFinish = validateString(
            v.finish,
            `variants[${variantIndex}].finish`,
            {
              maxLength: 100,
              required: false,
            },
          );

          // Validate grade
          const validatedGrade = validateNumber(
            v.grade,
            `variants[${variantIndex}].grade`,
            {
              required: false,
              min: 0,
              max: 20,
            },
          );

          // Validate material
          const validatedMaterial = validateString(
            v.material,
            `variants[${variantIndex}].material`,
            {
              maxLength: 100,
              required: false,
            },
          );

          // Validate thread type
          const validatedThreadType = validateString(
            v.threadType,
            `variants[${variantIndex}].threadType`,
            {
              maxLength: 50,
              required: false,
            },
          );

          // ==================== VALIDATE VARIANT PRICE USING PRICE SERVICE ====================
          if (!v.price) {
            throw new Error(`Price is required for variant ${variantIndex}`);
          }

          if (!v.price.mrp) {
            throw new Error(`MRP is required for variant ${variantIndex}`);
          }

          // Validate MRP
          const validatedMrp = validateNumber(
            v.price.mrp,
            `variants[${variantIndex}].price.mrp`,
            {
              required: true,
              min: 0.01,
            },
          );

          // Validate sellingPrice if provided
          if (v.price.sellingPrice !== undefined && v.price.sellingPrice !== null) {
            validateNumber(
              v.price.sellingPrice,
              `variants[${variantIndex}].price.sellingPrice`,
              {
                min: 0.01,
              },
            );
          }

          // Validate discountPercentage if provided
          if (v.price.discountPercentage !== undefined && v.price.discountPercentage !== null) {
            validateNumber(
              v.price.discountPercentage,
              `variants[${variantIndex}].price.discountPercentage`,
              {
                min: 0,
                max: 100,
              },
            );
          }

          // USE PRICE SERVICE TO CALCULATE PRICES
          const calculatedPrice = priceService.calculatePrice({
            mrp: v.price.mrp,
            sellingPrice: v.price.sellingPrice,
            discountPercentage: v.price.discountPercentage,
          });

          // Validate currency
          const validatedCurrency =
            validateString(
              v.price.currency,
              `variants[${variantIndex}].price.currency`,
              {
                minLength: 3,
                maxLength: 3,
                pattern: /^[A-Z]{3}$/,
                patternMessage:
                  "Currency must be a 3-letter ISO code (e.g., INR, USD)",
              },
            ) || "INR";

          /* ---------- UPDATE EXISTING VARIANT ---------- */
          if (v.id) {
            if (!dbMap.has(v.id)) throw new Error(`Invalid variant id ${v.id}`);

            variant = dbMap.get(v.id);
            incomingIds.add(variant.id);

            await variant.update(
              {
                variantCode: validatedVariantCode,
                packQuantity: validatedPackQuantity,
                finish: validatedFinish,
                grade: validatedGrade,
                material: validatedMaterial,
                threadType: validatedThreadType,
                isActive: v.isActive !== undefined ? v.isActive : true,
              },
              { transaction: t },
            );

            /* ---------- UPDATE PRICE USING PRICE SERVICE ---------- */
            await priceService.upsert(
              productId,
              variant.id,
              {
                mrp: calculatedPrice.mrp,
                sellingPrice: calculatedPrice.sellingPrice,
                discountPercentage: calculatedPrice.discountPercentage,
                currency: validatedCurrency,
              },
              t
            );

            /* ---------- REPLACE SIZES WITH INVENTORY MIGRATION ---------- */
            if (Array.isArray(v.sizes)) {
              // Validate each size
              v.sizes.forEach((s, sizeIndex) => {
                if (!s.length && !s.diameter) {
                  throw new Error(
                    `Either length or diameter must be provided for size at index ${sizeIndex} in variant ${variantIndex}`,
                  );
                }
                validateNumber(
                  s.diameter,
                  `variants[${variantIndex}].sizes[${sizeIndex}].diameter`,
                  {
                    min: 0,
                    required: false,
                  },
                );
                validateNumber(
                  s.length,
                  `variants[${variantIndex}].sizes[${sizeIndex}].length`,
                  {
                    min: 0,
                    required: false,
                  },
                );
                validateNumber(
                  s.approxWeightKg,
                  `variants[${variantIndex}].sizes[${sizeIndex}].approxWeightKg`,
                  {
                    min: 0,
                    required: false,
                  },
                );
              });

              // Get existing sizes for this variant
              const existingSizes = await VariantSize.findAll({
                where: { variantId: variant.id },
                transaction: t,
              });

              console.log(`Existing sizes for variant ${variant.id}:`, existingSizes.map(s => ({ id: s.id, diameter: s.diameter, length: s.length, weight: s.approxWeightKg })));

              // Track which existing sizes are reused
              const usedExistingSizeIds = new Set();
              const newSizesList = [];

              // First pass: Try to match existing sizes with new sizes (exact match including weight)
              for (let sizeIndex = 0; sizeIndex < v.sizes.length; sizeIndex++) {
                const newSizeData = v.sizes[sizeIndex];
                let matched = false;

                // Try to find an existing size that matches exactly (including weight)
                for (const existingSize of existingSizes) {
                  if (!usedExistingSizeIds.has(existingSize.id) && doSizesMatch(existingSize, newSizeData, false)) {
                    // Update the existing size if needed
                    if (existingSize.diameter !== (newSizeData.diameter ? Number(newSizeData.diameter) : null) ||
                        existingSize.length !== (newSizeData.length ? Number(newSizeData.length) : null) ||
                        existingSize.approxWeightKg !== (newSizeData.approxWeightKg ? Number(newSizeData.approxWeightKg) : null)) {
                      await existingSize.update({
                        diameter: newSizeData.diameter ? Number(newSizeData.diameter) : null,
                        length: newSizeData.length ? Number(newSizeData.length) : null,
                        approxWeightKg: newSizeData.approxWeightKg ? Number(newSizeData.approxWeightKg) : null,
                      }, { transaction: t });
                      console.log(`Updated existing size ${existingSize.id} with new dimensions`);
                    }
                    
                    newSizesList.push(existingSize);
                    usedExistingSizeIds.add(existingSize.id);
                    matched = true;
                    break;
                  }
                }

                // If no exact match found, create a new size
                if (!matched) {
                  const newSize = await VariantSize.create({
                    variantId: variant.id,
                    diameter: newSizeData.diameter ? Number(newSizeData.diameter) : null,
                    length: newSizeData.length ? Number(newSizeData.length) : null,
                    approxWeightKg: newSizeData.approxWeightKg ? Number(newSizeData.approxWeightKg) : null,
                  }, { transaction: t });
                  console.log(`Created new size ${newSize.id} for variant ${variant.id}`);
                  newSizesList.push(newSize);
                }
              }

              // Find sizes that need to be deleted
              const sizesToDelete = existingSizes.filter(size => !usedExistingSizeIds.has(size.id));
              
              if (sizesToDelete.length > 0) {
                console.log(`Sizes to delete for variant ${variant.id}:`, sizesToDelete.map(s => s.id));
                
                // Check inventory for sizes to delete
                for (const sizeToDelete of sizesToDelete) {
                  const inventoryCount = await StoreInventory.count({
                    where: { variantSizeId: sizeToDelete.id },
                    transaction: t,
                  });
                  
                  if (inventoryCount > 0) {
                    // First try to find a size with exact match (including weight)
                    let migratedToSize = null;
                    
                    // Try exact match first
                    for (const newSize of newSizesList) {
                      if (doSizesMatch(sizeToDelete, newSize, false) && sizeToDelete.id !== newSize.id) {
                        migratedToSize = newSize;
                        break;
                      }
                    }
                    
                    // If no exact match, try matching by diameter and length only (ignore weight)
                    if (!migratedToSize) {
                      for (const newSize of newSizesList) {
                        if (doSizesMatch(sizeToDelete, newSize, true) && sizeToDelete.id !== newSize.id) {
                          migratedToSize = newSize;
                          console.log(`Found partial match for size ${sizeToDelete.id} with new size ${newSize.id} (ignoring weight)`);
                          break;
                        }
                      }
                    }
                    
                    if (migratedToSize) {
                      // Migrate inventory to the matching size
                      console.log(`Migrating inventory from size ${sizeToDelete.id} to size ${migratedToSize.id}`);
                      
                      await StoreInventory.update(
                        { variantSizeId: migratedToSize.id },
                        {
                          where: { variantSizeId: sizeToDelete.id },
                          transaction: t,
                        }
                      );
                      
                      // Update variantId in inventory if needed (for safety)
                      await StoreInventory.update(
                        { variantId: variant.id },
                        {
                          where: { variantSizeId: migratedToSize.id },
                          transaction: t,
                        }
                      );
                    } else {
                      throw new Error(
                        `Cannot delete size with ID ${sizeToDelete.id} because it has ${inventoryCount} inventory items and no matching size found to migrate inventory to. Please remove inventory first or ensure a similar size exists.`
                      );
                    }
                  }
                  
                  // Now safe to delete the size
                  await sizeToDelete.destroy({ transaction: t });
                  console.log(`Deleted size ${sizeToDelete.id}`);
                }
              }
            }

            /* ---------- REPLACE IMAGES ---------- */
            const newImgs = variantImagesMap[`id_${variant.id}`] || [];

            if (newImgs.length > 0) {
              // Delete old images
              for (const img of variant.images) {
                const fullPath = path.join(__dirname, "../../", img.imageUrl);
                if (fs.existsSync(fullPath)) {
                  fs.unlinkSync(fullPath);
                }
              }

              await VariantImage.destroy({
                where: { variantId: variant.id },
                transaction: t,
              });

              // Validate max images (5)
              if (newImgs.length > 5) {
                throw new Error(
                  `Max 5 images allowed for variant ${variantIndex}`,
                );
              }

              await VariantImage.bulkCreate(
                newImgs.map((url, imgIndex) => ({
                  variantId: variant.id,
                  imageUrl: url,
                  isPrimary: imgIndex === 0,
                })),
                { transaction: t },
              );
            }

            // Debug: Log current inventory for this variant
            const inventoryItems = await StoreInventory.findAll({
              where: { variantId: variant.id },
              transaction: t,
            });
            console.log(`Inventory for variant ${variant.id}:`, JSON.stringify(inventoryItems, null, 2));
            
            // Update variant stock from inventory
            await updateVariantStockFromInventory(variant.id, t);
            
          } else {
            /* ---------- CREATE NEW VARIANT ---------- */
            if (!v.tempKey) throw new Error("tempKey required for new variant");

            // For new variants, totalStock starts at 0
            variant = await ProductVariant.create(
              {
                productId,
                variantCode: validatedVariantCode,
                packQuantity: validatedPackQuantity,
                finish: validatedFinish,
                grade: validatedGrade,
                material: validatedMaterial,
                threadType: validatedThreadType,
                totalStock: 0,
                stockStatus: "Out of Stock",
                isActive: v.isActive !== undefined ? v.isActive : true,
              },
              { transaction: t },
            );

            incomingIds.add(variant.id);

            /* ---------- CREATE PRICE USING PRICE SERVICE ---------- */
            await priceService.upsert(
              productId,
              variant.id,
              {
                mrp: calculatedPrice.mrp,
                sellingPrice: calculatedPrice.sellingPrice,
                discountPercentage: calculatedPrice.discountPercentage,
                currency: validatedCurrency,
              },
              t
            );

            /* ---------- CREATE SIZES ---------- */
            if (Array.isArray(v.sizes) && v.sizes.length > 0) {
              // Validate each size
              v.sizes.forEach((s, sizeIndex) => {
                if (!s.length && !s.diameter) {
                  throw new Error(
                    `Either length or diameter must be provided for size at index ${sizeIndex} in variant ${variantIndex}`,
                  );
                }
                validateNumber(
                  s.diameter,
                  `variants[${variantIndex}].sizes[${sizeIndex}].diameter`,
                  {
                    min: 0,
                    required: false,
                  },
                );
                validateNumber(
                  s.length,
                  `variants[${variantIndex}].sizes[${sizeIndex}].length`,
                  {
                    min: 0,
                    required: false,
                  },
                );
                validateNumber(
                  s.approxWeightKg,
                  `variants[${variantIndex}].sizes[${sizeIndex}].approxWeightKg`,
                  {
                    min: 0,
                    required: false,
                  },
                );
              });

              await VariantSize.bulkCreate(
                v.sizes.map((s) => ({
                  variantId: variant.id,
                  diameter: s.diameter ? Number(s.diameter) : null,
                  length: s.length ? Number(s.length) : null,
                  approxWeightKg: s.approxWeightKg ? Number(s.approxWeightKg) : null,
                })),
                { transaction: t },
              );
            }

            /* ---------- CREATE IMAGES ---------- */
            const imgs = variantImagesMap[`tmp_${v.tempKey}`] || [];
            if (imgs.length > 0) {
              if (imgs.length > 5) {
                throw new Error(
                  `Max 5 images allowed for variant ${variantIndex}`,
                );
              }

              await VariantImage.bulkCreate(
                imgs.map((url, imgIndex) => ({
                  variantId: variant.id,
                  imageUrl: url,
                  isPrimary: imgIndex === 0,
                })),
                { transaction: t },
              );
            }

            // Note: New variant has 0 stock, stock will be added via StoreInventory
          }
        } catch (error) {
          throw new Error(
            `Variant ${variantIndex} validation failed: ${error.message}`,
          );
        }
      }

      /* ---------- DELETE REMOVED VARIANTS ---------- */
      const toDelete = dbVariants.filter((v) => !incomingIds.has(v.id));

      if (toDelete.length > 0) {
        // Check if variants have any inventory before deletion
        for (const v of toDelete) {
          const inventoryCount = await StoreInventory.count({
            where: { variantId: v.id },
            transaction: t,
          });
          
          if (inventoryCount > 0) {
            throw new Error(
              `Cannot delete variant ${v.variantCode} because it has existing inventory. Please remove inventory first.`
            );
          }
        }

        // Delete images
        for (const v of toDelete) {
          for (const img of v.images) {
            const fullPath = path.join(__dirname, "../../", img.imageUrl);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          }
        }

        await VariantSize.destroy({
          where: { variantId: toDelete.map((v) => v.id) },
          transaction: t,
        });

        await VariantImage.destroy({
          where: { variantId: toDelete.map((v) => v.id) },
          transaction: t,
        });

        await ProductVariant.destroy({
          where: { id: toDelete.map((v) => v.id) },
          transaction: t,
        });
      }
    }

    /* ---------------- UPDATE OFFERS ---------------- */
    if (appliedOffers !== undefined) {
      const parsedAppliedOffers = parseJSON(appliedOffers, "appliedOffers");

      // Validate offers
      if (parsedAppliedOffers && parsedAppliedOffers.length > 0) {
        validateArray(parsedAppliedOffers, "appliedOffers");

        parsedAppliedOffers.forEach((offer, index) => {
          if (!offer.offerId) {
            throw new Error(
              `offerId is required for appliedOffer at index ${index}`,
            );
          }
          validateNumber(offer.offerId, `appliedOffers[${index}].offerId`, {
            required: true,
            isInteger: true,
            min: 1,
          });

          if (offer.subOfferId) {
            validateNumber(
              offer.subOfferId,
              `appliedOffers[${index}].subOfferId`,
              {
                isInteger: true,
                min: 1,
              },
            );
          }
        });
      }

      await OfferApplicableProduct.destroy({
        where: { productId },
        transaction: t,
      });

      if (parsedAppliedOffers && parsedAppliedOffers.length > 0) {
        await OfferApplicableProduct.bulkCreate(
          parsedAppliedOffers.map((o) => ({
            productId,
            offerId: o.offerId,
            subOfferId: o.subOfferId,
          })),
          { transaction: t, validate: true },
        );
      }
    }

    await t.commit();

    return res.json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }

    console.error("UPDATE PRODUCT ERROR:", error);

    // Handle Sequelize validation errors
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map((e) => ({
          field: e.path,
          message: e.message,
        })),
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Product update failed",
    });
  }
};