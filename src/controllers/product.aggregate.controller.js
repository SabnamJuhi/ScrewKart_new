const sequelize = require("../config/db");

const Product = require("../models/products/product.model");
const ProductPrice = require("../models/products/price.model");
const ProductSpec = require("../models/products/productSpec.model");
const ProductVariant = require("../models/productVariants/productVariant.model");
const VariantImage = require("../models/productVariants/variantImage.model");
const VariantSize = require("../models/productVariants/variantSize.model");

const Offer = require("../models/offers/offer.model");
const OfferSub = require("../models/offers/offerSub.model");
const OfferApplicableCategory = require("../models/offers/offerApplicableCategory.model");
const OfferApplicableProduct = require("../models/offers/offerApplicableProduct.model");
const { Category, SubCategory, ProductCategory, ProductRating, ProductReview} = require("../models");

const { Op } = require("sequelize");

// exports.createProduct = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     console.log("BODY:", req.body);
//     console.log("FILES:", req.files?.length || 0);

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
//     } = req.body;

//     const parsedPrice = JSON.parse(price);
//     const parsedSpecs = JSON.parse(specs);
//     const parsedVariants = JSON.parse(variants);
//     const parsedAppliedOffers = appliedOffers ? JSON.parse(appliedOffers) : [];

//     /* ---------------- VARIANT IMAGE MAP ---------------- */
//     const variantImagesMap = {};

//     for (const file of req.files || []) {
//       const match = file.fieldname.match(/^variantImages_(\d+)$/);
//       if (!match) continue;

//       const index = Number(match[1]);

//       if (!variantImagesMap[index]) {
//         variantImagesMap[index] = [];
//       }

//       if (variantImagesMap[index].length >= 5) {
//         throw new Error(`Max 5 images allowed for variant ${index}`);
//       }

//       variantImagesMap[index].push(`/uploads/products/${file.filename}`);
//     }

//     /* ---------------- CREATE PRODUCT ---------------- */
//     const product = await Product.create(
//       {
//         title,
//         categoryId: Number(categoryId),
//         subCategoryId: Number(subCategoryId),
//         productCategoryId: Number(productCategoryId),
//         description,
//         badge,
//         brandName,
//       },
//       { transaction: t },
//     );

//     /* ---------------- PRICE ---------------- */
//     await ProductPrice.create(
//       { productId: product.id, ...parsedPrice },
//       { transaction: t },
//     );

//     /* ---------------- SPECS ---------------- */
//     for (const key in parsedSpecs) {
//       await ProductSpec.create(
//         {
//           productId: product.id,
//           specKey: key,
//           specValue: Array.isArray(parsedSpecs[key])
//             ? parsedSpecs[key].join(", ")
//             : parsedSpecs[key],
//         },
//         { transaction: t },
//       );
//     }

//     /* ---------------- VARIANTS ---------------- */
//     for (let i = 0; i < parsedVariants.length; i++) {
//       const v = parsedVariants[i];

//       const variant = await ProductVariant.create(
//         {
//           productId: product.id,
//           variantCode: v.variantCode,
//           colorName: v.color.name,
//           colorCode: v.color.code,
//           swatch: v.color.swatch || null,
//           totalStock: v.totalStock || 0,
//           stockStatus: v.stockStatus || "Out of Stock",
//         },
//         { transaction: t },
//       );

//       /* Images */
//       const images = variantImagesMap[i] || [];
//       if (images.length) {
//         await VariantImage.bulkCreate(
//           images.map((img) => ({
//             variantId: variant.id,
//             imageUrl: img,
//           })),
//           { transaction: t },
//         );
//       }

//       /* Sizes */
//       if (v.sizes?.length) {
//         await VariantSize.bulkCreate(
//           v.sizes.map((s) => ({
//             variantId: variant.id,
//             size: s.size,
//             stock: s.stock,
//             chest: s.chest ?? null,
//           })),
//           { transaction: t },
//         );
//       }
//     }

//     /* ---------------- OFFERS ---------------- */
//     if (parsedAppliedOffers.length) {
//       await OfferApplicableProduct.bulkCreate(
//         parsedAppliedOffers.map((o) => ({
//           productId: product.id,
//           offerId: o.offerId,
//           subOfferId: o.subOfferId,
//         })),
//         { transaction: t },
//       );
//     }

//     await t.commit();

//     res.status(201).json({
//       success: true,
//       message: "Product created with multiple variants",
//       productId: product.id,
//     });
//   } catch (error) {
//     await t.rollback();
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.updateProductDetails = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { id: productId } = req.params;
//     const {
//       title,
//       description,
//       badge,
//       brandName,
//       isActive,
//       price,
//       specs,
//       variants,
//     } = req.body;

//     /* ---------------- FIND PRODUCT ---------------- */
//     const product = await Product.findByPk(productId, { transaction: t });
//     if (!product) {
//       await t.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     /* ---------------- PRODUCT CORE ---------------- */
//     await product.update(
//       {
//         ...(title !== undefined && { title }),
//         ...(description !== undefined && { description }),
//         ...(badge !== undefined && { badge }),
//         ...(brandName !== undefined && { brandName }),
//         ...(isActive !== undefined && { isActive }),
//       },
//       { transaction: t },
//     );

//     /* ---------------- PRICE ---------------- */
//     if (price) {
//       const p = typeof price === "string" ? JSON.parse(price) : price;

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

//     /* ---------------- SPECS ---------------- */
//     if (specs) {
//       const parsedSpecs = typeof specs === "string" ? JSON.parse(specs) : specs;

//       await ProductSpec.destroy({
//         where: { productId },
//         transaction: t,
//       });

//       for (const key in parsedSpecs) {
//         await ProductSpec.create(
//           {
//             productId,
//             specKey: key,
//             specValue: Array.isArray(parsedSpecs[key])
//               ? parsedSpecs[key].join(", ")
//               : parsedSpecs[key],
//           },
//           { transaction: t },
//         );
//       }
//     }

//     /* ================= VARIANT IMAGES MAP ================= */
//     const variantImagesMap = {};

//     for (const file of req.files || []) {
//       let match;

//       // Existing variant images
//       match = file.fieldname.match(/^variantImages_id_(\d+)$/);
//       if (match) {
//         const key = `id_${match[1]}`;
//         variantImagesMap[key] ??= [];
//         variantImagesMap[key].push(`/uploads/products/${file.filename}`);
//         continue;
//       }

//       // New variant images
//       match = file.fieldname.match(/^variantImages_tmp_(.+)$/);
//       if (match) {
//         const key = `tmp_${match[1]}`;
//         variantImagesMap[key] ??= [];
//         variantImagesMap[key].push(`/uploads/products/${file.filename}`);
//       }
//     }

//     /* ================= VARIANTS ================= */
//     if (variants) {
//       const parsedVariants =
//         typeof variants === "string" ? JSON.parse(variants) : variants;

//       const dbVariants = await ProductVariant.findAll({
//         where: { productId },
//         transaction: t,
//       });

//       const dbMap = new Map(dbVariants.map((v) => [v.id, v]));
//       const incomingIds = new Set();

//       for (const v of parsedVariants) {
//         let variant;

//         /* ---------- UPDATE VARIANT ---------- */
//         if (v.id) {
//           if (!dbMap.has(v.id)) {
//             throw new Error(`Invalid variant id ${v.id}`);
//           }

//           variant = dbMap.get(v.id);
//           incomingIds.add(variant.id);

//           await variant.update(
//             {
//               variantCode: v.variantCode,
//               colorName: v.color.name,
//               colorCode: v.color.code,
//               colorSwatch: v.color.swatch ?? null,
//               totalStock: v.totalStock,
//               stockStatus: v.stockStatus,
//               isActive: v.isActive,
//             },
//             { transaction: t },
//           );

//           /* ---------- SIZES (REPLACE) ---------- */
//           if (Array.isArray(v.sizes)) {
//             await VariantSize.destroy({
//               where: { variantId: variant.id },
//               transaction: t,
//             });

//             await VariantSize.bulkCreate(
//               v.sizes.map((s) => ({
//                 variantId: variant.id,
//                 size: s.size,
//                 stock: s.stock,
//                 chest: s.chest ?? null,
//               })),
//               { transaction: t },
//             );
//           }

//           /* ---------- IMAGES (REPLACE IF SENT) ---------- */
//           const imgs = variantImagesMap[`id_${variant.id}`] || [];

//           if (imgs.length > 0) {
//             // 🔥 THIS WAS MISSING
//             await VariantImage.destroy({
//               where: { variantId: variant.id },
//               transaction: t,
//             });

//             await VariantImage.bulkCreate(
//               imgs.map((img) => ({
//                 variantId: variant.id,
//                 imageUrl: img,
//               })),
//               { transaction: t },
//             );
//           }
//         } else {
//           /* ---------- CREATE VARIANT ---------- */
//           if (!v.tempKey) {
//             throw new Error("tempKey is required for new variant");
//           }

//           variant = await ProductVariant.create(
//             {
//               productId,
//               variantCode: v.variantCode,
//               colorName: v.color.name,
//               colorCode: v.color.code,
//               colorSwatch: v.color.swatch ?? null,
//               totalStock: v.totalStock || 0,
//               stockStatus: v.stockStatus || "Out of Stock",
//             },
//             { transaction: t },
//           );

//           incomingIds.add(variant.id);

//           /* Sizes */
//           if (Array.isArray(v.sizes)) {
//             await VariantSize.bulkCreate(
//               v.sizes.map((s) => ({
//                 variantId: variant.id,
//                 size: s.size,
//                 stock: s.stock,
//                 chest: s.chest ?? null,
//               })),
//               { transaction: t },
//             );
//           }

//           /* Images */
//           const imgs = variantImagesMap[`tmp_${v.tempKey}`] || [];
//           if (imgs.length > 0) {
//             await VariantImage.bulkCreate(
//               imgs.map((img) => ({
//                 variantId: variant.id,
//                 imageUrl: img,
//               })),
//               { transaction: t },
//             );
//           }
//         }
//       }

//       /* ---------- DELETE REMOVED VARIANTS ---------- */
//       const toDelete = dbVariants
//         .filter((v) => !incomingIds.has(v.id))
//         .map((v) => v.id);

//       if (toDelete.length) {
//         await VariantSize.destroy({
//           where: { variantId: toDelete },
//           transaction: t,
//         });

//         await VariantImage.destroy({
//           where: { variantId: toDelete },
//           transaction: t,
//         });

//         await ProductVariant.destroy({
//           where: { id: toDelete },
//           transaction: t,
//         });
//       }
//     }

//     await t.commit();

//     res.json({
//       success: true,
//       message: "Product updated successfully",
//     });
//   } catch (error) {
//     await t.rollback();
//     console.error("UPDATE PRODUCT ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.getProductById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const product = await Product.findByPk(id, {
//       attributes: [
//         "id",
//         "title",
//         "description",
//         "brandName",
//         "badge",
//         "isActive",
//         "createdAt",
//         "updatedAt",
//       ],

//       include: [
//         // CATEGORY HIERARCHY

//         {
//           model: Category,
//           as: "Category",
//           attributes: ["id", "name"],
//         },
//         {
//           model: SubCategory,
//           as: "SubCategory",
//           attributes: ["id", "name"],
//         },
//         {
//           model: ProductCategory,
//           as: "ProductCategory",
//           attributes: ["id", "name"],
//         },

//         // PRICE

//         {
//           model: ProductPrice,
//           as: "price",
//         },

//         // SPECS

//         {
//           model: ProductSpec,
//           as: "specs",
//         },

//         // RATINGS & REVIEWS

//         {
//           model: ProductRating,
//           as: "rating",
//         },
//         {
//           model: ProductReview,
//           as: "reviews",
//         },

//         // VARIANTS (IMAGES + SIZES)

//         {
//           model: ProductVariant,
//           as: "variants",
//           attributes: [
//             "id",
//             "variantCode",
//             "colorName",
//             "colorCode",
//             "colorSwatch",
//             "totalStock",
//             "stockStatus",
//             "isActive",
//           ],
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//             },
//             {
//               model: VariantSize,
//               as: "sizes",
//               attributes: ["id", "size", "stock", "chest"],
//             },
//           ],
//         },

//         // OFFERS (PRODUCT → OFFER → SUB OFFERS)

//         {
//           model: OfferApplicableProduct,
//           as: "offerApplicableProducts",
//           attributes: ["id", "offerId", "subOfferId"],
//           include: [
//             {
//               model: Offer,
//               as: "offerDetails",
//               attributes: [
//                 "id",
//                 "offerCode",
//                 "title",
//                 "festival",
//                 "description",
//                 "startDate",
//                 "endDate",
//                 "isActive",
//               ],
//               include: [
//                 {
//                   model: OfferSub,
//                   as: "subOffers",
//                   attributes: [
//                     "id",
//                     "discountType",
//                     "discountValue",
//                     "maxDiscount",
//                   ],
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//     });

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     return res.json({
//       success: true,
//       data: product,
//     });
//   } catch (error) {
//     console.error("GET PRODUCT ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.getAllProductsDetails = async (req, res) => {
//   try {
//     const products = await Product.findAll({
//       attributes: [
//         "id",
//         "title",
//         "description",
//         "brandName",
//         "badge",
//         "isActive",
//         "createdAt",
//       ],

//       include: [
//         // CATEGORY HIERARCHY
//         {
//           model: Category,
//           as: "Category",
//           attributes: ["id", "name"],
//         },
//         {
//           model: SubCategory,
//           as: "SubCategory",
//           attributes: ["id", "name"],
//         },
//         {
//           model: ProductCategory,
//           as: "ProductCategory",
//           attributes: ["id", "name"],
//         },

//         // PRICE

//         {
//           model: ProductPrice,
//           as: "price",
//         },

//         // SPECS
//         {
//           model: ProductSpec,
//           as: "specs",
//         },

//         // VARIANTS → IMAGES → SIZES

//         {
//           model: ProductVariant,
//           as: "variants",
//           attributes: [
//             "id",
//             "variantCode",
//             "colorName",
//             "colorCode",
//             "colorSwatch",
//             "totalStock",
//             "stockStatus",
//             "isActive",
//           ],
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//             },
//             {
//               model: VariantSize,
//               as: "sizes",
//               attributes: ["id", "size", "stock", "chest"],
//             },
//           ],
//         },

//         // OFFERS

//         {
//           model: OfferApplicableProduct,
//           as: "offerApplicableProducts",
//           attributes: ["id", "offerId", "subOfferId"],
//           include: [
//             {
//               model: Offer,
//               as: "offerDetails",
//               attributes: [
//                 "id",
//                 "offerCode",
//                 "title",
//                 "festival",
//                 "description",
//                 "startDate",
//                 "endDate",
//                 "isActive",
//               ],
//               include: [
//                 {
//                   model: OfferSub,
//                   as: "subOffers",
//                   attributes: [
//                     "id",
//                     "discountType",
//                     "discountValue",
//                     "maxDiscount",
//                   ],
//                 },
//               ],
//             },
//           ],
//         },
//       ],

//       order: [["createdAt", "DESC"]],
//     });

//     return res.json({
//       success: true,
//       count: products.length,
//       data: products,
//     });
//   } catch (error) {
//     console.error("GET ALL PRODUCTS ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.softDeleteProduct = async (req, res) => {
//   try {
//     const product = await Product.findByPk(req.params.id);
//     if (!product) return res.status(404).json({ message: "Not found" });

//     // Just flip the switch
//     await product.update({ isActive: false });

//     res.json({ success: true, message: "Product deactivated (Archived)" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.deleteProductPermanently = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { id: productId } = req.params;

//     const product = await Product.findByPk(productId, { transaction: t });
//     if (!product) {
//       await t.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     /* ---------- VARIANTS ---------- */
//     const variants = await ProductVariant.findAll({
//       where: { productId },
//       attributes: ["id"],
//       transaction: t,
//     });

//     const variantIds = variants.map(v => v.id);

//     if (variantIds.length) {
//       // Variant Sizes
//       await VariantSize.destroy({
//         where: { variantId: variantIds },
//         transaction: t,
//       });

//       // Variant Images
//       await VariantImage.destroy({
//         where: { variantId: variantIds },
//         transaction: t,
//       });

//       // Variants
//       await ProductVariant.destroy({
//         where: { id: variantIds },
//         transaction: t,
//       });
//     }

//     /* ---------- PRODUCT RELATED ---------- */
//     await ProductSpec.destroy({ where: { productId }, transaction: t });
//     await ProductPrice.destroy({ where: { productId }, transaction: t });
//     await ProductRating.destroy({ where: { productId }, transaction: t });
//     await ProductReview.destroy({ where: { productId }, transaction: t });
//     await OfferApplicableProduct.destroy({ where: { productId }, transaction: t });

//     /* ---------- FINALLY DELETE PRODUCT ---------- */
//     await Product.destroy({
//       where: { id: productId },
//       transaction: t,
//     });

//     await t.commit();

//     res.json({
//       success: true,
//       message: "Product permanently deleted with all related data",
//     });
//   } catch (error) {
//     await t.rollback();
//     console.error("DELETE PRODUCT ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


// exports.getProductFilters = async (req, res) => {
//   try {
//     /* ---------------- BRANDS ---------------- */
//     const brandsRaw = await Product.findAll({
//       attributes: ["brandName"],
//       group: ["brandName"],
//       raw: true,
//     });

//     const brands = brandsRaw.map((b) => b.brandName).filter(Boolean);

//     /* ---------------- CATEGORY TREE ---------------- */
//     const categories = await Category.findAll({
//       attributes: ["id", "name"],
//       include: [
//         {
//           model: SubCategory,
//           as: "subcategories",
//           attributes: ["id", "name"],
//           include: [
//             {
//               model: ProductCategory,
//               as: "productCategories",
//               attributes: ["id", "name"],
//             },
//           ],
//         },
//       ],
//     });

//     /* ---------------- COLORS (FIXED FOR TiDB) ---------------- */
//     const colorsRaw = await ProductVariant.findAll({
//       attributes: ["colorName", "colorCode"],
//       group: ["colorName", "colorCode"],
//       raw: true,
//     });

//     const colors = colorsRaw
//       .filter((c) => c.colorName && c.colorCode)
//       .map((c) => ({
//         name: c.colorName,
//         code: c.colorCode,
//       }));

//     /* ---------------- SIZES ---------------- */
//     const sizesRaw = await VariantSize.findAll({
//       attributes: ["size"],
//       group: ["size"],
//       raw: true,
//     });

//     const sizes = sizesRaw.map((s) => s.size).filter(Boolean);

//     /* ---------------- SPECS ---------------- */
//     const specsRaw = await ProductSpec.findAll({
//       attributes: ["specKey", "specValue"],
//       raw: true,
//     });

//     const specs = {};

//     specsRaw.forEach((s) => {
//       if (!specs[s.specKey]) specs[s.specKey] = new Set();

//       s.specValue.split(",").forEach((v) => {
//         specs[s.specKey].add(v.trim());
//       });
//     });

//     Object.keys(specs).forEach((k) => {
//       specs[k] = Array.from(specs[k]);
//     });

//     /* ---------------- PRICE RANGE ---------------- */
//     const priceRaw = await ProductPrice.findOne({
//       attributes: [
//         [sequelize.fn("MIN", sequelize.col("sellingPrice")), "min"],
//         [sequelize.fn("MAX", sequelize.col("sellingPrice")), "max"],
//       ],
//       raw: true,
//     });

//     const priceRange = {
//       min: Number(priceRaw?.min || 0),
//       max: Number(priceRaw?.max || 0),
//     };

//     /* ---------------- AVAILABILITY ---------------- */
//     const availabilityRaw = await ProductVariant.findAll({
//       attributes: ["stockStatus"],
//       group: ["stockStatus"],
//       raw: true,
//     });

//     const availability = availabilityRaw
//       .map((a) => a.stockStatus)
//       .filter(Boolean);

//     /* ---------------- RESPONSE ---------------- */
//     return res.json({
//       success: true,
//       filters: {
//         brands,
//         categories,
//         colors,
//         sizes,
//         specs,
//         priceRange,
//         availability,
//       },
//     });
//   } catch (error) {
//     console.error("FILTER METADATA ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.getFilteredProducts = async (req, res) => {
//   try {
//     const {
//       categoryId,
//       subCategoryId,
//       productCategoryId,
//       brands,
//       colors,
//       sizes,
//       minPrice,
//       maxPrice,
//       inStock,
//       specs,
//     } = req.query;

//     /* ---------------- HELPER ---------------- */
//     const toArray = (val) => (val ? val.split(",").map((v) => v.trim()) : []);

//     /* ---------------- PRODUCT WHERE ---------------- */
//     const productWhere = {
//       isActive: true,
//     };

//     if (categoryId) {
//       productWhere.categoryId = { [Op.in]: toArray(categoryId) };
//     }

//     if (subCategoryId) {
//       productWhere.subCategoryId = { [Op.in]: toArray(subCategoryId) };
//     }

//     if (productCategoryId) {
//       productWhere.productCategoryId = { [Op.in]: toArray(productCategoryId) };
//     }

//     if (brands) {
//       productWhere.brandName = { [Op.in]: toArray(brands) };
//     }

//     /* ---------------- PRICE WHERE ---------------- */
//     const priceWhere = {};

//     if (minPrice || maxPrice) {
//       priceWhere.sellingPrice = {};
//       if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
//       if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
//     }

//     /* ---------------- VARIANT WHERE ---------------- */
//     const variantWhere = {};

//     if (colors) {
//       variantWhere.colorName = { [Op.in]: toArray(colors) };
//     }

//     if (inStock === "true") {
//       variantWhere.totalStock = { [Op.gt]: 0 };
//     }

//     /* ---------------- SIZE WHERE ---------------- */
//     const sizeWhere = {};

//     if (sizes) {
//       sizeWhere.size = { [Op.in]: toArray(sizes) };
//       if (inStock === "true") {
//         sizeWhere.stock = { [Op.gt]: 0 };
//       }
//     }

//     /* ---------------- SPECS WHERE ---------------- */
//     const specIncludes = [];

//     if (specs && typeof specs === "object") {
//       Object.entries(specs).forEach(([key, value]) => {
//         const values = toArray(value);

//         specIncludes.push({
//           model: ProductSpec,
//           as: "specs",
//           where: {
//             specKey: key,
//             specValue: {
//               [Op.or]: values.map((v) => ({ [Op.like]: `%${v}%` })),
//             },
//           },
//           required: true,
//         });
//       });
//     }

//     /* ---------------- FINAL QUERY ---------------- */
//     const products = await Product.findAll({
//       where: productWhere,

//       include: [
//         {
//           model: ProductPrice,
//           as: "price",
//           where: priceWhere,
//           required: Object.keys(priceWhere).length > 0,
//         },

//         {
//           model: ProductVariant,
//           as: "variants",
//           where: variantWhere,
//           required: Object.keys(variantWhere).length > 0,

//           include: [
//             {
//               model: VariantSize,
//               as: "sizes",
//               where: sizeWhere,
//               required:
//                 Object.keys(variantWhere).length > 0 ||
//                 Object.keys(sizeWhere).length > 0,
//             },
//           ],
//         },

//         ...specIncludes,
//       ],

//       distinct: true,
//     });

//     return res.json({
//       success: true,
//       count: products.length,
//       data: products,
//     });
//   } catch (error) {
//     console.error("FILTER PRODUCT ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
