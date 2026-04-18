const sequelize = require("../../config/db");
const { ValidationError } = require("sequelize");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");
const priceService = require("../../services/price.service");
const VariantPricingSlab = require("../../models/products/variantPricingSlab.model");

const ProductMeasurement = require("../../models/products/productMeasurement.model");
const ProductAttribute = require("../../models/products/productAttribute.model");

const generateSKU = require("../../utils/skuGenerator");

/* ---------------- SAFE JSON PARSER ---------------- */
const parseJSON = (data, fieldName) => {
  try {
    if (data === undefined || data === null) {
      return fieldName === "appliedOffers" ? [] : null;
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
  const { minLength = 1, maxLength, pattern, patternMessage, required = false } = options;

  if (!value && value !== "") {
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

/* ---------------- MAIN FUNCTION ---------------- */
exports.createProduct = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    console.log("FILES RECEIVED:", req.files);

    // Build variant images map from uploaded files
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

    const {
      title,
      brandName,
      categoryId,
      subCategoryId,
      productCategoryId,
      description,
      badge,
      variants,
      appliedOffers,
      gstRate,
      attributes,
      measurements,
    } = req.body;

    const parsedVariants = parseJSON(variants, "variants");
    const parsedAppliedOffers = parseJSON(appliedOffers, "appliedOffers");
    const parsedAttributes = parseJSON(attributes, "attributes");
    const parsedMeasurements = parseJSON(measurements, "measurements");

    // ==================== VALIDATIONS ====================
    validateRequired(title, "title");
    validateRequired(categoryId, "categoryId");
    validateRequired(subCategoryId, "subCategoryId");
    validateRequired(productCategoryId, "productCategoryId");
    validateRequired(gstRate, "gstRate");

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
      { required: true, isInteger: true, min: 1 }
    );

    const validatedProductCategoryId = validateNumber(
      productCategoryId,
      "productCategoryId",
      { required: true, isInteger: true, min: 1 }
    );

    const validatedDescription = validateString(description, "description", {
      maxLength: 2000,
      required: false,
    });

    const validatedBadge = validateString(badge, "badge", {
      maxLength: 50,
      required: false,
    });

    const validatedGstRate = validateNumber(gstRate, "gstRate", {
      required: true,
      min: 0,
      max: 100,
    });

    validateArray(parsedVariants, "variants", { minLength: 1 });

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
      { transaction: t }
    );

    /* ---------------- PRODUCT ATTRIBUTES ---------------- */
    if (parsedAttributes && typeof parsedAttributes === "object" && Object.keys(parsedAttributes).length > 0) {
      const attrRows = Object.entries(parsedAttributes).map(([key, value]) => ({
        productId: product.id,
        variantId: null,
        attributeKey: String(key).substring(0, 255),
        attributeValue: String(value).substring(0, 500),
      }));

      await ProductAttribute.bulkCreate(attrRows, { transaction: t });
    }

    /* ---------------- PRODUCT MEASUREMENTS ---------------- */
    if (Array.isArray(parsedMeasurements) && parsedMeasurements.length > 0) {
      const measurementRows = parsedMeasurements.map((m) => ({
        productId: product.id,
        variantId: null,
        measurementId: m.measurementId,
        value: String(m.value).substring(0, 255),
      }));

      await ProductMeasurement.bulkCreate(measurementRows, {
        transaction: t,
      });
    }

    /* ---------------- VARIANTS ---------------- */
    const createdVariants = [];

    for (let i = 0; i < parsedVariants.length; i++) {
      const v = parsedVariants[i];
      const variantIndex = i;

      try {
        // ==================== VALIDATE VARIANT ====================

        const validatedVariantCode = validateString(
          v.variantCode,
          `variants[${variantIndex}].variantCode`,
          {
            minLength: 1,
            maxLength: 50,
            required: true,
            pattern: /^[A-Za-z0-9_-]+$/,
            patternMessage: "Variant code must contain only letters, numbers, underscores and hyphens",
          }
        );

        // Validate unit (ENUM: PCS, BOX)
        let validatedUnit = "PCS";
        if (v.unit) {
          const unitValue = validateString(v.unit, `variants[${variantIndex}].unit`, {
            minLength: 1,
            maxLength: 10,
            required: false,
          });
          if (unitValue && ["PCS", "BOX"].includes(unitValue)) {
            validatedUnit = unitValue;
          }
        }

        // Validate MOQ
        const validatedMoq = validateNumber(v.moq, `variants[${variantIndex}].moq`, {
          min: 1,
          isInteger: true,
          required: false,
        }) || 1;

        // Validate packingType (ENUM: LOOSE, BOX)
        let validatedPackingType = null;
        if (v.packingType) {
          const packingTypeValue = validateString(
            v.packingType,
            `variants[${variantIndex}].packingType`,
            { required: false, maxLength: 10 }
          );
          if (packingTypeValue && ["LOOSE", "BOX"].includes(packingTypeValue)) {
            validatedPackingType = packingTypeValue;
          }
        }

        // Validate packQuantity (required if packingType is BOX)
        let validatedPackQuantity = null;
        if (v.packQuantity !== undefined && v.packQuantity !== null) {
          validatedPackQuantity = validateNumber(
            v.packQuantity,
            `variants[${variantIndex}].packQuantity`,
            {
              required: false,
              isInteger: true,
              min: 1,
            }
          );
        } else if (validatedPackingType === "BOX") {
          throw new Error(`packQuantity is required when packingType is BOX for variant ${variantIndex}`);
        }

        // Validate dispatchType (ENUM: INSTANT, CUSTOM)
        let validatedDispatchType = "INSTANT";
        if (v.dispatchType) {
          const dispatchTypeValue = validateString(
            v.dispatchType,
            `variants[${variantIndex}].dispatchType`,
            { required: false, maxLength: 10 }
          );
          if (dispatchTypeValue && ["INSTANT", "CUSTOM"].includes(dispatchTypeValue)) {
            validatedDispatchType = dispatchTypeValue;
          }
        }

        // Validate deliverySla
        let validatedDeliverySla = null;
        if (v.deliverySla) {
          validatedDeliverySla = validateString(
            v.deliverySla,
            `variants[${variantIndex}].deliverySla`,
            { required: false, maxLength: 100 }
          );
          if (validatedDeliverySla) {
            validatedDeliverySla = validatedDeliverySla.substring(0, 100);
          }
        }

        // ==================== PRICE VALIDATION ====================

        if (!v.price) throw new Error(`Price is required for variant ${variantIndex}`);

        const validatedMrp = validateNumber(v.price.mrp, `variants[${variantIndex}].price.mrp`, {
          required: true,
          min: 0.01,
        });

        // Validate sellingPrice if provided
        if (v.price.sellingPrice !== undefined && v.price.sellingPrice !== null) {
          validateNumber(v.price.sellingPrice, `variants[${variantIndex}].price.sellingPrice`, {
            min: 0.01,
          });
        }

        // Validate discountPercentage if provided
        if (v.price.discountPercentage !== undefined && v.price.discountPercentage !== null) {
          validateNumber(v.price.discountPercentage, `variants[${variantIndex}].price.discountPercentage`, {
            min: 0,
            max: 100,
          });
        }

        const calculatedPrice = priceService.calculatePrice({
          mrp: v.price.mrp,
          sellingPrice: v.price.sellingPrice,
          discountPercentage: v.price.discountPercentage,
        });

        const validatedCurrency = validateString(v.price.currency, `variants[${variantIndex}].price.currency`, {
          minLength: 3,
          maxLength: 3,
          pattern: /^[A-Z]{3}$/,
          patternMessage: "Currency must be a 3-letter ISO code (e.g., INR, USD)",
          required: false,
        }) || "INR";

        // ==================== VALIDATE PRICING SLABS ====================
        if (v.pricingSlabs && !Array.isArray(v.pricingSlabs)) {
          throw new Error(`pricingSlabs must be an array for variant ${variantIndex}`);
        }

        if (v.pricingSlabs && v.pricingSlabs.length > 0) {
          validateArray(v.pricingSlabs, `variants[${variantIndex}].pricingSlabs`, {
            minLength: 1,
            itemValidator: (slab, idx) => {
              validateNumber(slab.minQty, `pricingSlabs[${idx}].minQty`, {
                required: true,
                min: 2,
                isInteger: true,
              });

              if (slab.maxQty !== null && slab.maxQty !== undefined) {
                validateNumber(slab.maxQty, `pricingSlabs[${idx}].maxQty`, {
                  min: slab.minQty,
                  isInteger: true,
                });
              }

              validateNumber(slab.price, `pricingSlabs[${idx}].price`, {
                required: true,
                min: 0.01,
              });
            },
          });

          // Validate slab continuity
          const sortedSlabs = [...v.pricingSlabs].sort((a, b) => a.minQty - b.minQty);

          for (let j = 1; j < sortedSlabs.length; j++) {
            const prev = sortedSlabs[j - 1];
            const curr = sortedSlabs[j];

            if (prev.maxQty && prev.maxQty + 1 !== curr.minQty) {
              throw new Error(`Pricing slabs must be continuous (no gaps) for variant ${variantIndex}`);
            }
          }
        }

        // ==================== CREATE VARIANT ====================

        const variantData = {
          productId: product.id,
          variantCode: validatedVariantCode,
          unit: validatedUnit,
          moq: validatedMoq,
          packingType: validatedPackingType,
          packQuantity: validatedPackQuantity,
          dispatchType: validatedDispatchType,
          deliverySla: validatedDeliverySla,
          totalStock: 0,
          stockStatus: "Out of Stock",
          isActive: v.isActive !== undefined ? v.isActive : true,
        };

        console.log(`Creating variant ${variantIndex} with data:`, variantData);

        const variant = await ProductVariant.create(variantData, { transaction: t });

        createdVariants.push(variant);

        // ==================== PRICE ====================

        await priceService.upsert(
          product.id,
          variant.id,
          {
            mrp: calculatedPrice.mrp,
            sellingPrice: calculatedPrice.sellingPrice,
            discountPercentage: calculatedPrice.discountPercentage,
            currency: validatedCurrency,
          },
          t
        );

        // ==================== PRICING SLABS ====================

        if (Array.isArray(v.pricingSlabs) && v.pricingSlabs.length > 0) {
          const sortedSlabs = [...v.pricingSlabs].sort((a, b) => a.minQty - b.minQty);

          const slabData = sortedSlabs.map((slab) => ({
            variantId: variant.id,
            minQty: slab.minQty,
            maxQty: slab.maxQty || null,
            price: slab.price,
          }));

          await VariantPricingSlab.bulkCreate(slabData, { transaction: t });
        }

        // ==================== IMAGES ====================

        const images = variantImagesMap[i] || [];

        if (images.length > 0) {
          await VariantImage.bulkCreate(
            images.map((img, idx) => ({
              variantId: variant.id,
              imageUrl: img,
              isPrimary: idx === 0,
            })),
            { transaction: t }
          );
        }

        // ==================== VARIANT ATTRIBUTES ====================

        if (Array.isArray(v.attributes) && v.attributes.length > 0) {
          const variantAttrRows = v.attributes.map((a) => ({
            productId: product.id,
            variantId: variant.id,
            attributeKey: String(a.attributeKey).substring(0, 255),
            attributeValue: String(a.attributeValue).substring(0, 500),
          }));

          await ProductAttribute.bulkCreate(variantAttrRows, { transaction: t });
        }

        // ==================== VARIANT MEASUREMENTS ====================

        if (Array.isArray(v.measurements) && v.measurements.length > 0) {
          const variantMeasurementRows = v.measurements.map((m) => ({
            productId: product.id,
            variantId: variant.id,
            measurementId: m.measurementId,
            value: String(m.value).substring(0, 255),
          }));

          await ProductMeasurement.bulkCreate(variantMeasurementRows, {
            transaction: t,
          });
        }
      } catch (error) {
        throw new Error(
          `Variant ${variantIndex} failed: ${error.message}`
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
        { transaction: t }
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
    if (t && !t.finished) await t.rollback();

    console.error("CREATE PRODUCT ERROR:", error);

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