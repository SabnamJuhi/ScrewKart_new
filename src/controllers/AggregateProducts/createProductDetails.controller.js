// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");
// const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");
// const generateSKU = require("../../utils/skuGenerator");

// /* ---------------- SAFE JSON PARSER ---------------- */
// const parseJSON = (data, fieldName) => {
//   try {
//     return typeof data === "string" ? JSON.parse(data) : data;
//   } catch {
//     throw new Error(`Invalid JSON format in "${fieldName}"`);
//   }
// };

// exports.createProduct = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     console.log("FILES RECEIVED:", req.files); // 🔥 debug

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

//     if (!title || !categoryId || !subCategoryId || !productCategoryId) {
//       throw new Error("Missing required product fields");
//     }

//     const parsedPrice = parseJSON(price, "price");
//     const parsedSpecs = parseJSON(specs, "specs");
//     const parsedVariants = parseJSON(variants, "variants");
//     const parsedAppliedOffers = appliedOffers
//       ? parseJSON(appliedOffers, "appliedOffers")
//       : [];

//     if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
//       throw new Error("At least one variant is required");
//     }

//     /* -------- MAP VARIANT IMAGES -------- */
//     const variantImagesMap = {};

//     for (const file of req.files || []) {
//       const match = file.fieldname.match(/^variantImages_(\d+)$/);
//       if (!match) continue;

//       const index = Number(match[1]);

//       if (!variantImagesMap[index]) variantImagesMap[index] = [];

//       if (variantImagesMap[index].length >= 5) {
//         throw new Error(`Max 5 images allowed for variant ${index}`);
//       }

//       const imagePath = `/uploads/products/${file.filename}`;
//       variantImagesMap[index].push(imagePath);
//     }
//     if (gstRate === undefined || gstRate === null) {
//       throw new Error("GST rate is required");
//     }
//     const numericGst = Number(gstRate);

//     if (isNaN(numericGst)) {
//       throw new Error("Invalid GST rate");
//     }
//     /* ---------------- CREATE PRODUCT ---------------- */
//     const product = await Product.create(
//       {
//         title,
//         brandName,
//         categoryId: Number(categoryId),
//         subCategoryId: Number(subCategoryId),
//         productCategoryId: Number(productCategoryId),
//         description,
//         badge,
//         gstRate: numericGst,
//       },
//       { transaction: t },
//     );

//     /* ---------------- PRICE ---------------- */
//     await ProductPrice.create(
//       {
//         productId: product.id,
//         mrp: parsedPrice.mrp,
//         sellingPrice: parsedPrice.sellingPrice,
//         discountPercentage:
//           parsedPrice.mrp > parsedPrice.sellingPrice
//             ? Math.round(
//                 ((parsedPrice.mrp - parsedPrice.sellingPrice) /
//                   parsedPrice.mrp) *
//                   100,
//               )
//             : 0,
//         currency: parsedPrice.currency || "INR",
//       },
//       { transaction: t },
//     );

//     /* ---------------- SPECS ---------------- */
//     const specRows = Object.keys(parsedSpecs).map((key) => ({
//       productId: product.id,
//       specKey: key,
//       specValue: Array.isArray(parsedSpecs[key])
//         ? parsedSpecs[key].join(", ")
//         : parsedSpecs[key],
//     }));

//     if (specRows.length) {
//       await ProductSpec.bulkCreate(specRows, { transaction: t });
//     }

//     /* ---------------- VARIANTS ---------------- */
//     for (let i = 0; i < parsedVariants.length; i++) {
//       const v = parsedVariants[i];

//       const variant = await ProductVariant.create(
//         {
//           productId: product.id,
//           variantCode: v.variantCode,
//           colorName: v.color?.name,
//           colorCode: v.color?.code,
//           swatch: v.color?.swatch || null,
//           totalStock: v.totalStock || 0,
//           stockStatus: v.stockStatus || "Out of Stock",
//         },
//         { transaction: t },
//       );

//       /* -------- IMAGES -------- */
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

//       /* -------- SIZES -------- */
//       if (Array.isArray(v.sizes) && v.sizes.length) {
//         await VariantSize.bulkCreate(
//           v.sizes.map((s) => ({
//             variantId: variant.id,
//             length: s.length,
//             stock: s.stock,
//             diameter: s.diameter ?? null,
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
//     const fullProduct = await Product.findByPk(product.id, {
//       include: ["Category", "SubCategory", "ProductCategory"],
//       transaction: t,
//     });

//     const generatedSku = await generateSKU(fullProduct, t);
//     console.log("FULL PRODUCT:", fullProduct?.id);
//     console.log("GENERATED SKU:", generatedSku);

//     await product.update({ sku: generatedSku }, { transaction: t });

//     /* ---------------- COMMIT ---------------- */
//     await t.commit();

//     return res.status(201).json({
//       success: true,
//       message: "Product created successfully",
//       productId: product.id,
//       sku: generatedSku,
//     });
//   } catch (error) {
//     if (t && !t.finished) {
//       await t.rollback();
//     }

//     console.error("CREATE PRODUCT ERROR:", error);

//     console.error("CREATE PRODUCT ERROR FULL:", error);

//     return res.status(500).json({
//       success: false,
//       message: error?.message || "Product creation failed",
//       error: error?.errors || null, // Sequelize validation errors
//     });
//   }
// };







// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");
// const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

// const generateSKU = require("../../utils/skuGenerator");

// /* ---------------- SAFE JSON PARSER ---------------- */
// const parseJSON = (data, fieldName) => {
//   try {
//     return typeof data === "string" ? JSON.parse(data) : data;
//   } catch {
//     throw new Error(`Invalid JSON format in "${fieldName}"`);
//   }
// };

// exports.createProduct = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const {
//       title,
//       brandName,
//       categoryId,
//       subCategoryId,
//       productCategoryId,
//       description,
//       badge,
//       specs,
//       variants,
//       appliedOffers,
//       gstRate,
//     } = req.body;

//     if (!title || !categoryId || !subCategoryId || !productCategoryId) {
//       throw new Error("Missing required product fields");
//     }

//     const parsedSpecs = parseJSON(specs, "specs");
//     const parsedVariants = parseJSON(variants, "variants");
//     const parsedAppliedOffers = appliedOffers
//       ? parseJSON(appliedOffers, "appliedOffers")
//       : [];

//     if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
//       throw new Error("At least one variant is required");
//     }

//     /* ---------------- CREATE PRODUCT ---------------- */
//     const product = await Product.create(
//       {
//         title,
//         brandName,
//         categoryId: Number(categoryId),
//         subCategoryId: Number(subCategoryId),
//         productCategoryId: Number(productCategoryId),
//         description,
//         badge,
//         gstRate: Number(gstRate),
//       },
//       { transaction: t }
//     );

//     /* ---------------- SPECS ---------------- */
//     const specRows = Object.keys(parsedSpecs || {}).map((key) => ({
//       productId: product.id,
//       specKey: key,
//       specValue: parsedSpecs[key],
//     }));

//     if (specRows.length) {
//       await ProductSpec.bulkCreate(specRows, { transaction: t });
//     }

//     /* ---------------- VARIANTS ---------------- */
//     for (let i = 0; i < parsedVariants.length; i++) {
//       const v = parsedVariants[i];

//       /* ---- CREATE VARIANT ---- */
//       const variant = await ProductVariant.create(
//         {
//           productId: product.id,
//           variantCode: v.variantCode,
//           packQuantity: v.packQuantity,
//           finish: v.finish,
//           grade: v.grade,
//           material: v.material,
//           threadType: v.threadType,
//           totalStock: v.totalStock || 0,
//           stockStatus: v.stockStatus || "In Stock",
//         },
//         { transaction: t }
//       );

//       /* -------- VARIANT PRICE -------- */
//       if (!v.price?.mrp) {
//         throw new Error(`Price missing for variant ${i}`);
//       }

//       const mrp = Number(v.price.mrp);

//       let sellingPrice = v.price.sellingPrice
//         ? Number(v.price.sellingPrice)
//         : null;

//       let discountPercentage = v.price.discountPercentage
//         ? Number(v.price.discountPercentage)
//         : null;

//       if (discountPercentage !== null) {
//         sellingPrice = mrp - (mrp * discountPercentage) / 100;
//       }

//       if (sellingPrice !== null && discountPercentage === null) {
//         discountPercentage = ((mrp - sellingPrice) / mrp) * 100;
//       }

//       await ProductPrice.create(
//         {
//           variantId: variant.id,
//           mrp,
//           sellingPrice: Math.round(sellingPrice),
//           discountPercentage: Math.round(discountPercentage),
//           currency: v.price.currency || "INR",
//         },
//         { transaction: t }
//       );

//       /* -------- IMAGES -------- */
//       if (Array.isArray(v.images) && v.images.length) {
//         await VariantImage.bulkCreate(
//           v.images.map((img) => ({
//             variantId: variant.id,
//             imageUrl: img,
//           })),
//           { transaction: t }
//         );
//       }

//       /* -------- SIZES -------- */
//       if (Array.isArray(v.sizes) && v.sizes.length) {
//         await VariantSize.bulkCreate(
//           v.sizes.map((s) => ({
//             variantId: variant.id,
//             length: s.length,
//             diameter: s.diameter ?? null,
//             approxWeightKg: s.approxWeightKg ?? null,
//             stock: s.stock || 0,
//           })),
//           { transaction: t }
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
//         { transaction: t }
//       );
//     }

//     /* ---------------- SKU GENERATION ---------------- */
//     const fullProduct = await Product.findByPk(product.id, {
//       include: ["Category", "SubCategory", "ProductCategory"],
//       transaction: t,
//     });

//     const generatedSku = await generateSKU(fullProduct, t);

//     await product.update({ sku: generatedSku }, { transaction: t });

//     await t.commit();

//     return res.status(201).json({
//       success: true,
//       message: "Product created successfully",
//       productId: product.id,
//       sku: generatedSku,
//     });
//   } catch (error) {
//     if (t && !t.finished) await t.rollback();

//     console.error("CREATE PRODUCT ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message || "Product creation failed",
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

const generateSKU = require("../../utils/skuGenerator");

/* ---------------- SAFE JSON PARSER ---------------- */
const parseJSON = (data, fieldName) => {
  try {
    if (data === undefined || data === null) {
      return fieldName === "specs"
        ? {}
        : fieldName === "appliedOffers"
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
  if (!value && value !== 0) {
    throw new Error(`${fieldName} is required`);
  }
  return value;
};

const validateNumber = (value, fieldName, options = {}) => {
  const { min, max, isInteger = false } = options;

  if (value === undefined || value === null) {
    if (options.required) throw new Error(`${fieldName} is required`);
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
  const { minLength = 1, maxLength, pattern, patternMessage } = options;

  if (!value && value !== "") {
    if (options.required) throw new Error(`${fieldName} is required`);
    return value;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (options.required && trimmed.length === 0) {
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
  const { minLength = 0, maxLength, itemValidator } = options;

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

/* ---------------- MAIN FUNCTION ---------------- */
exports.createProduct = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    console.log("FILES RECEIVED:", req.files); // 🔥 debug

    // ==================== VALIDATE REQUEST BODY ====================
    const {
      title,
      brandName,
      categoryId,
      subCategoryId,
      productCategoryId,
      description,
      badge,
      specs,
      variants,
      appliedOffers,
      gstRate,
    } = req.body;

    // Basic required fields validation
    validateRequired(title, "title");
    validateRequired(categoryId, "categoryId");
    validateRequired(subCategoryId, "subCategoryId");
    validateRequired(productCategoryId, "productCategoryId");
    validateRequired(gstRate, "gstRate");

    // ==================== VALIDATE PRODUCT FIELDS ====================
    const validatedTitle = validateString(title, "title", {
      minLength: 3,
      maxLength: 200,
      required: true,
    });

    const validatedBrandName = validateString(brandName, "brandName", {
      minLength: 1,
      maxLength: 100,
      required: false,
    });

    const validatedCategoryId = validateNumber(categoryId, "categoryId", {
      required: true,
      isInteger: true,
      min: 1,
    });

    const validatedSubCategoryId = validateNumber(
      subCategoryId,
      "subCategoryId",
      {
        required: true,
        isInteger: true,
        min: 1,
      },
    );

    const validatedProductCategoryId = validateNumber(
      productCategoryId,
      "productCategoryId",
      {
        required: true,
        isInteger: true,
        min: 1,
      },
    );

    const validatedDescription = validateString(description, "description", {
      minLength: 0,
      maxLength: 2000,
      required: false,
    });

    const validatedBadge = validateString(badge, "badge", {
      minLength: 0,
      maxLength: 50,
      required: false,
    });

    const validatedGstRate = validateNumber(gstRate, "gstRate", {
      required: true,
      min: 0,
      max: 100,
    });

    // ==================== PARSE JSON FIELDS ====================
    const parsedSpecs = parseJSON(specs, "specs");
    const parsedVariants = parseJSON(variants, "variants");
    const parsedAppliedOffers = parseJSON(appliedOffers, "appliedOffers");

    // ==================== VALIDATE VARIANTS ====================
    validateArray(parsedVariants, "variants", { minLength: 1 });

    // Check for duplicate variant codes
    const variantCodes = parsedVariants
      .map((v) => v.variantCode)
      .filter(Boolean);
    const duplicateCodes = variantCodes.filter(
      (code, index) => variantCodes.indexOf(code) !== index,
    );
    if (duplicateCodes.length > 0) {
      throw new Error(
        `Duplicate variant codes found: ${duplicateCodes.join(", ")}`,
      );
    }

    // ==================== VALIDATE SPECS ====================
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

    // ==================== VALIDATE OFFERS ====================
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

    /* -------- MAP VARIANT IMAGES (OLD APPROACH) -------- */
    const variantImagesMap = {};

    for (const file of req.files || []) {
      const match = file.fieldname.match(/^variantImages_(\d+)$/);
      if (!match) continue;

      const index = Number(match[1]);

      if (!variantImagesMap[index]) variantImagesMap[index] = [];

      if (variantImagesMap[index].length >= 5) {
        throw new Error(`Max 5 images allowed for variant ${index}`);
      }

      const imagePath = `/uploads/products/${file.filename}`;
      variantImagesMap[index].push(imagePath);
    }

    /* ---------------- CREATE PRODUCT ---------------- */
    const product = await Product.create(
      {
        title: validatedTitle,
        brandName: validatedBrandName,
        categoryId: validatedCategoryId,
        subCategoryId: validatedSubCategoryId,
        productCategoryId: validatedProductCategoryId,
        description: validatedDescription,
        badge: validatedBadge,
        gstRate: validatedGstRate,
      },
      { transaction: t },
    );

    /* ---------------- SPECS ---------------- */
    if (parsedSpecs && Object.keys(parsedSpecs).length > 0) {
      const specRows = Object.entries(parsedSpecs).map(([key, value]) => ({
        productId: product.id,
        specKey: key,
        specValue: Array.isArray(value) ? value.join(", ") : String(value),
      }));

      await ProductSpec.bulkCreate(specRows, { transaction: t });
    }

    /* ---------------- VARIANTS ---------------- */
    const createdVariants = [];

    for (let i = 0; i < parsedVariants.length; i++) {
      const v = parsedVariants[i];
      const variantIndex = i;

      try {
        // ==================== VALIDATE VARIANT FIELDS ====================
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

        const validatedPackQuantity = validateNumber(
          v.packQuantity,
          `variants[${variantIndex}].packQuantity`,
          {
            required: false,
            isInteger: true,
            min: 1,
          },
        );

        const validatedFinish = validateString(
          v.finish,
          `variants[${variantIndex}].finish`,
          {
            maxLength: 100,
            required: false,
          },
        );

        const validatedGrade = validateNumber(
          v.grade,
          `variants[${variantIndex}].grade`,
          {
            required: false,
            min: 0,
            max: 20,
          },
        );

        const validatedMaterial = validateString(
          v.material,
          `variants[${variantIndex}].material`,
          {
            maxLength: 100,
            required: false,
          },
        );

        const validatedThreadType = validateString(
          v.threadType,
          `variants[${variantIndex}].threadType`,
          {
            maxLength: 50,
            required: false,
          },
        );

        // Color fields (from old code)
        const colorName = v.color?.name || null;
        const colorCode = v.color?.code || null;
        const swatch = v.color?.swatch || null;

        let calculatedTotalStock = 0;

        if (Array.isArray(v.sizes) && v.sizes.length > 0) {
          calculatedTotalStock = v.sizes.reduce((sum, s) => {
            return sum + Number(s.stock || 0);
          }, 0);
        }

        const validStockStatuses = [
          "In Stock",
          "Out of Stock",
          "Pre-Order",
          "Discontinued",
        ];
        if (v.stockStatus && !validStockStatuses.includes(v.stockStatus)) {
          throw new Error(
            `variants[${variantIndex}].stockStatus must be one of: ${validStockStatuses.join(", ")}`,
          );
        }

        // ==================== VALIDATE VARIANT PRICE ====================
        if (!v.price) {
          throw new Error(`Price is required for variant ${variantIndex}`);
        }

        if (!v.price.mrp) {
          throw new Error(`MRP is required for variant ${variantIndex}`);
        }

        const validatedMrp = validateNumber(
          v.price.mrp,
          `variants[${variantIndex}].price.mrp`,
          {
            required: true,
            min: 0.01,
          },
        );

        let validatedSellingPrice = null;
        let validatedDiscountPercentage = null;

        // Validate based on what's provided
        if (
          v.price.sellingPrice !== undefined &&
          v.price.sellingPrice !== null
        ) {
          validatedSellingPrice = validateNumber(
            v.price.sellingPrice,
            `variants[${variantIndex}].price.sellingPrice`,
            {
              min: 0.01,
            },
          );

          if (validatedSellingPrice > validatedMrp) {
            throw new Error(
              `Selling price cannot be greater than MRP for variant ${variantIndex}`,
            );
          }
        }

        if (
          v.price.discountPercentage !== undefined &&
          v.price.discountPercentage !== null
        ) {
          validatedDiscountPercentage = validateNumber(
            v.price.discountPercentage,
            `variants[${variantIndex}].price.discountPercentage`,
            {
              min: 0,
              max: 100,
            },
          );
        }

        // Calculate missing values
        if (validatedDiscountPercentage !== null) {
          validatedSellingPrice =
            validatedMrp - (validatedMrp * validatedDiscountPercentage) / 100;
          validatedSellingPrice = Math.round(validatedSellingPrice);
        } else if (validatedSellingPrice !== null) {
          validatedDiscountPercentage =
            ((validatedMrp - validatedSellingPrice) / validatedMrp) * 100;
          validatedDiscountPercentage = Math.round(validatedDiscountPercentage);
        } else {
          throw new Error(
            `Either sellingPrice or discountPercentage must be provided for variant ${variantIndex}`,
          );
        }

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

        /* ---- CREATE VARIANT (with color fields from old code) ---- */
        const variant = await ProductVariant.create(
          {
            productId: product.id,
            variantCode: validatedVariantCode,
            packQuantity: validatedPackQuantity,
            finish: validatedFinish,
            grade: validatedGrade,
            material: validatedMaterial,
            threadType: validatedThreadType,
            colorName: colorName,
            colorCode: colorCode,
            swatch: swatch,
            totalStock: calculatedTotalStock,
            stockStatus:
              v.stockStatus ||
              (calculatedTotalStock > 0 ? "In Stock" : "Out of Stock"),
          },
          { transaction: t },
        );

        createdVariants.push(variant);

        /* -------- VARIANT PRICE -------- */
        await ProductPrice.create(
          {
            variantId: variant.id,
            mrp: validatedMrp,
            sellingPrice: validatedSellingPrice,
            discountPercentage: validatedDiscountPercentage,
            currency: validatedCurrency,
          },
          { transaction: t },
        );

        /* -------- IMAGES (OLD APPROACH - FROM UPLOADED FILES) -------- */
        const images = variantImagesMap[i] || [];

        if (images.length > 0) {
          await VariantImage.bulkCreate(
            images.map((img, imgIndex) => ({
              variantId: variant.id,
              imageUrl: img,
              isPrimary: imgIndex === 0, // First image as primary
            })),
            { transaction: t },
          );
        }

        /* -------- SIZES -------- */
        if (Array.isArray(v.sizes) && v.sizes.length > 0) {
          validateArray(v.sizes, `variants[${variantIndex}].sizes`, {
            minLength: 1,
            itemValidator: (size, idx) => {
              if (!size.length && !size.diameter) {
                throw new Error(
                  `Either length or diameter must be provided for size at index ${idx}`,
                );
              }
            },
          });

          const sizePromises = v.sizes.map(async (s, sizeIndex) => {
            const validatedLength = validateNumber(
              s.length,
              `variants[${variantIndex}].sizes[${sizeIndex}].length`,
              {
                min: 0,
                required: false,
              },
            );

            const validatedDiameter = validateNumber(
              s.diameter,
              `variants[${variantIndex}].sizes[${sizeIndex}].diameter`,
              {
                min: 0,
                required: false,
              },
            );

            const validatedWeight = validateNumber(
              s.approxWeightKg,
              `variants[${variantIndex}].sizes[${sizeIndex}].approxWeightKg`,
              {
                min: 0,
                required: false,
              },
            );

            const validatedStock = validateNumber(
              s.stock,
              `variants[${variantIndex}].sizes[${sizeIndex}].stock`,
              {
                required: true,
                isInteger: true,
                min: 0,
              },
            );

            return {
              variantId: variant.id,
              length: validatedLength,
              diameter: validatedDiameter,
              approxWeightKg: validatedWeight,
              stock: validatedStock,
            };
          });

          const sizeData = await Promise.all(sizePromises);
          await VariantSize.bulkCreate(sizeData, { transaction: t });
        }
      } catch (error) {
        throw new Error(
          `Variant ${variantIndex} validation failed: ${error.message}`,
        );
      }
    }

    // Verify total stock across sizes matches variant totalStock
    for (const variant of createdVariants) {
      const sizes = await VariantSize.findAll({
        where: { variantId: variant.id },
        transaction: t,
      });

      const totalSizeStock = sizes.reduce((sum, size) => sum + size.stock, 0);
      if (totalSizeStock !== variant.totalStock) {
        throw new Error(
          `Total stock (${variant.totalStock}) for variant ${variant.variantCode} does not match sum of size stocks (${totalSizeStock})`,
        );
      }
    }

    /* ---------------- OFFERS ---------------- */
    if (parsedAppliedOffers && parsedAppliedOffers.length > 0) {
      await OfferApplicableProduct.bulkCreate(
        parsedAppliedOffers.map((o) => ({
          productId: product.id,
          offerId: o.offerId,
          subOfferId: o.subOfferId,
        })),
        { transaction: t, validate: true },
      );
    }

    /* ---------------- SKU GENERATION ---------------- */
    const fullProduct = await Product.findByPk(product.id, {
      include: [
        { association: "Category", required: false },
        { association: "SubCategory", required: false },
        { association: "ProductCategory", required: false },
      ],
      transaction: t,
    });

    const generatedSku = await generateSKU(fullProduct, t);
    await product.update({ sku: generatedSku }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: {
        productId: product.id,
        sku: generatedSku,
        variantCount: createdVariants.length,
      },
    });
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }

    console.error("CREATE PRODUCT ERROR:", error);

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
      message: error.message || "Product creation failed",
    });
  }
};