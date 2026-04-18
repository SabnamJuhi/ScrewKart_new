

const sequelize = require("../../config/db");
const { ValidationError, Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

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

/* ---------------- HELPER TO DELETE IMAGE FILES ---------------- */
const deleteImageFiles = async (images) => {
  for (const img of images) {
    const fullPath = path.join(__dirname, "../../", img.imageUrl);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`Deleted image file: ${fullPath}`);
      } catch (err) {
        console.error(`Failed to delete image: ${fullPath}`, err);
      }
    }
  }
};

/* ---------------- MAIN UPDATE FUNCTION ---------------- */
exports.updateProductDetails = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id: productId } = req.params;
    console.log("FILES RECEIVED FOR UPDATE:", req.files ? req.files.map(f => ({ fieldname: f.fieldname, filename: f.filename })) : []);

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
      updateData.subCategoryId = validateNumber(subCategoryId, "subCategoryId", {
        required: true,
        isInteger: true,
        min: 1,
      });
    }

    if (productCategoryId !== undefined) {
      updateData.productCategoryId = validateNumber(productCategoryId, "productCategoryId", {
        required: true,
        isInteger: true,
        min: 1,
      });
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

    /* ---------------- UPDATE PRODUCT ATTRIBUTES ---------------- */
    if (attributes !== undefined) {
      const parsedAttributes = parseJSON(attributes, "attributes");

      await ProductAttribute.destroy({
        where: {
          productId: product.id,
          variantId: null,
        },
        transaction: t,
      });

      if (parsedAttributes && typeof parsedAttributes === "object" && Object.keys(parsedAttributes).length > 0) {
        const attrRows = Object.entries(parsedAttributes).map(([key, value]) => ({
          productId: product.id,
          variantId: null,
          attributeKey: String(key).substring(0, 255),
          attributeValue: String(value).substring(0, 500),
        }));
        await ProductAttribute.bulkCreate(attrRows, { transaction: t });
      }
    }

    /* ---------------- UPDATE PRODUCT MEASUREMENTS ---------------- */
    if (measurements !== undefined) {
      const parsedMeasurements = parseJSON(measurements, "measurements");

      await ProductMeasurement.destroy({
        where: {
          productId: product.id,
          variantId: null,
        },
        transaction: t,
      });

      if (Array.isArray(parsedMeasurements) && parsedMeasurements.length > 0) {
        const measurementRows = parsedMeasurements.map((m) => ({
          productId: product.id,
          variantId: null,
          measurementId: m.measurementId,
          value: String(m.value).substring(0, 255),
        }));
        await ProductMeasurement.bulkCreate(measurementRows, { transaction: t });
      }
    }

    /* ================= MAP UPLOADED IMAGES ================= */
    const variantImagesMap = {};

    for (const file of req.files || []) {
      let match;

      // existing variant images: variantImages_id_{variantId}
      match = file.fieldname.match(/^variantImages_id_(\d+)$/);
      if (match) {
        const key = `id_${match[1]}`;
        if (!variantImagesMap[key]) variantImagesMap[key] = [];
        if (variantImagesMap[key].length >= 5) {
          throw new Error(`Max 5 images allowed for variant with ID ${match[1]}`);
        }
        const imagePath = `/uploads/products/${file.filename}`;
        variantImagesMap[key].push(imagePath);
        console.log(`Mapped image for existing variant ID ${match[1]}: ${imagePath}`);
        continue;
      }

      // new variant images: variantImages_tmp_{tempKey}
      match = file.fieldname.match(/^variantImages_tmp_(.+)$/);
      if (match) {
        const key = `tmp_${match[1]}`;
        if (!variantImagesMap[key]) variantImagesMap[key] = [];
        if (variantImagesMap[key].length >= 5) {
          throw new Error(`Max 5 images allowed for new variant with tempKey ${match[1]}`);
        }
        const imagePath = `/uploads/products/${file.filename}`;
        variantImagesMap[key].push(imagePath);
        console.log(`Mapped image for new variant with tempKey ${match[1]}: ${imagePath}`);
      }
    }

    /* ================= VARIANTS ================= */
    if (variants !== undefined) {
      const parsedVariants = parseJSON(variants, "variants");
      validateArray(parsedVariants, "variants", { minLength: 1 });

      // Get existing variants with their images
      const dbVariants = await ProductVariant.findAll({
        where: { productId: product.id },
        include: [{ model: VariantImage, as: "images" }],
        transaction: t,
      });

      console.log("Existing variants in DB:", dbVariants.map(v => ({ id: v.id, code: v.variantCode, imageCount: v.images?.length })));

      const dbMap = new Map(dbVariants.map((v) => [v.id, v]));
      const incomingIds = new Set();

      for (let i = 0; i < parsedVariants.length; i++) {
        const v = parsedVariants[i];
        const variantIndex = i;
        let variant;

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
              patternMessage: "Variant code must contain only letters, numbers, underscores and hyphens",
            }
          );

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

          const validatedMoq = validateNumber(v.moq, `variants[${variantIndex}].moq`, {
            min: 1,
            isInteger: true,
            required: false,
          }) || 1;

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

          let validatedPackQuantity = null;
          if (v.packQuantity !== undefined && v.packQuantity !== null) {
            validatedPackQuantity = validateNumber(
              v.packQuantity,
              `variants[${variantIndex}].packQuantity`,
              { required: false, isInteger: true, min: 1 }
            );
          } else if (validatedPackingType === "BOX") {
            throw new Error(`packQuantity is required when packingType is BOX for variant ${variantIndex}`);
          }

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
          if (!v.price) {
            throw new Error(`Price is required for variant ${variantIndex}`);
          }

          if (!v.price.mrp) {
            throw new Error(`MRP is required for variant ${variantIndex}`);
          }

          if (v.price.sellingPrice !== undefined && v.price.sellingPrice !== null) {
            validateNumber(v.price.sellingPrice, `variants[${variantIndex}].price.sellingPrice`, { min: 0.01 });
          }

          if (v.price.discountPercentage !== undefined && v.price.discountPercentage !== null) {
            validateNumber(v.price.discountPercentage, `variants[${variantIndex}].price.discountPercentage`, { min: 0, max: 100 });
          }

          const calculatedPrice = priceService.calculatePrice({
            mrp: v.price.mrp,
            sellingPrice: v.price.sellingPrice,
            discountPercentage: v.price.discountPercentage,
          });

          const validatedCurrency = validateString(
            v.price.currency,
            `variants[${variantIndex}].price.currency`,
            {
              minLength: 3,
              maxLength: 3,
              pattern: /^[A-Z]{3}$/,
              patternMessage: "Currency must be a 3-letter ISO code (e.g., INR, USD)",
              required: false,
            }
          ) || "INR";

          // ==================== VALIDATE PRICING SLABS ====================
          if (v.pricingSlabs && !Array.isArray(v.pricingSlabs)) {
            throw new Error(`pricingSlabs must be an array for variant ${variantIndex}`);
          }

          if (v.pricingSlabs && v.pricingSlabs.length > 0) {
            validateArray(v.pricingSlabs, `variants[${variantIndex}].pricingSlabs`, {
              minLength: 1,
              itemValidator: (slab, idx) => {
                validateNumber(slab.minQty, `pricingSlabs[${idx}].minQty`, { required: true, min: 2, isInteger: true });
                if (slab.maxQty !== null && slab.maxQty !== undefined) {
                  validateNumber(slab.maxQty, `pricingSlabs[${idx}].maxQty`, { min: slab.minQty, isInteger: true });
                }
                validateNumber(slab.price, `pricingSlabs[${idx}].price`, { required: true, min: 0.01 });
              },
            });

            const sortedSlabs = [...v.pricingSlabs].sort((a, b) => a.minQty - b.minQty);
            if (sortedSlabs[0].minQty <= 1) {
              throw new Error("First slab must start from quantity greater than 1 (base price handles 1+)");
            }

            for (let j = 1; j < sortedSlabs.length; j++) {
              const prev = sortedSlabs[j - 1];
              const curr = sortedSlabs[j];
              if (prev.maxQty + 1 !== curr.minQty) {
                throw new Error("Pricing slabs must be continuous (no gaps)");
              }
            }
          }

          /* ---------- UPDATE EXISTING VARIANT ---------- */
          if (v.id) {
            if (!dbMap.has(v.id)) throw new Error(`Invalid variant id ${v.id}`);

            variant = dbMap.get(v.id);
            incomingIds.add(variant.id);

            console.log(`Updating existing variant ID: ${variant.id}, Code: ${variant.variantCode}`);

            await variant.update(
              {
                variantCode: validatedVariantCode,
                unit: validatedUnit,
                moq: validatedMoq,
                packingType: validatedPackingType,
                packQuantity: validatedPackQuantity,
                dispatchType: validatedDispatchType,
                deliverySla: validatedDeliverySla,
                isActive: v.isActive !== undefined ? v.isActive : true,
              },
              { transaction: t }
            );

            /* ---------- UPDATE PRICE ---------- */
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

            /* ---------- UPDATE PRICING SLABS ---------- */
            if (v.pricingSlabs !== undefined) {
              await VariantPricingSlab.destroy({
                where: { variantId: variant.id },
                transaction: t,
              });

              if (v.pricingSlabs && v.pricingSlabs.length > 0) {
                const sortedSlabs = [...v.pricingSlabs].sort((a, b) => a.minQty - b.minQty);
                const slabData = sortedSlabs.map((slab) => ({
                  variantId: variant.id,
                  minQty: slab.minQty,
                  maxQty: slab.maxQty || null,
                  price: slab.price,
                }));
                await VariantPricingSlab.bulkCreate(slabData, { transaction: t });
              }
            }

            /* ---------- REPLACE IMAGES - DELETE OLD, ADD NEW ---------- */
            const newImgs = variantImagesMap[`id_${variant.id}`] || [];

            if (newImgs.length > 0) {
              // Log current images
              console.log(`Variant ${variant.id} has ${variant.images?.length || 0} old images`);
              console.log(`Received ${newImgs.length} new images for variant ${variant.id}`);

              // STEP 1: Delete old image files from storage
              if (variant.images && variant.images.length > 0) {
                for (const img of variant.images) {
                  const fullPath = path.join(__dirname, "../../", img.imageUrl);
                  if (fs.existsSync(fullPath)) {
                    try {
                      fs.unlinkSync(fullPath);
                      console.log(`Deleted old image file: ${fullPath}`);
                    } catch (err) {
                      console.error(`Failed to delete old image: ${fullPath}`, err);
                    }
                  }
                }
              }
              
              // STEP 2: Delete old image records from database
              const deletedCount = await VariantImage.destroy({
                where: { variantId: variant.id },
                transaction: t,
              });
              console.log(`Deleted ${deletedCount} old image records for variant ${variant.id}`);
              
              // STEP 3: Validate max images (5)
              if (newImgs.length > 5) {
                throw new Error(`Max 5 images allowed for variant ${variantIndex}`);
              }
              
              // STEP 4: Create new image records
              const newImages = await VariantImage.bulkCreate(
                newImgs.map((url, imgIndex) => ({
                  variantId: variant.id,
                  imageUrl: url,
                  isPrimary: imgIndex === 0,
                })),
                { transaction: t }
              );
              console.log(`Created ${newImages.length} new images for variant ${variant.id}`);
            }

            /* ---------- UPDATE VARIANT ATTRIBUTES ---------- */
            if (v.attributes !== undefined) {
              await ProductAttribute.destroy({
                where: { variantId: variant.id },
                transaction: t,
              });

              if (Array.isArray(v.attributes) && v.attributes.length > 0) {
                const variantAttrRows = v.attributes.map((a) => ({
                  productId: product.id,
                  variantId: variant.id,
                  attributeKey: String(a.attributeKey).substring(0, 255),
                  attributeValue: String(a.attributeValue).substring(0, 500),
                }));
                await ProductAttribute.bulkCreate(variantAttrRows, { transaction: t });
              }
            }

            /* ---------- UPDATE VARIANT MEASUREMENTS ---------- */
            if (v.measurements !== undefined) {
              await ProductMeasurement.destroy({
                where: { variantId: variant.id },
                transaction: t,
              });

              if (Array.isArray(v.measurements) && v.measurements.length > 0) {
                const variantMeasurementRows = v.measurements.map((m) => ({
                  productId: product.id,
                  variantId: variant.id,
                  measurementId: m.measurementId,
                  value: String(m.value).substring(0, 255),
                }));
                await ProductMeasurement.bulkCreate(variantMeasurementRows, { transaction: t });
              }
            }
          } else {
            /* ---------- CREATE NEW VARIANT ---------- */
            if (!v.tempKey) throw new Error("tempKey required for new variant");

            console.log(`Creating new variant with tempKey: ${v.tempKey}`);

            variant = await ProductVariant.create(
              {
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
              },
              { transaction: t }
            );

            incomingIds.add(variant.id);

            /* ---------- CREATE PRICE ---------- */
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

            /* ---------- CREATE PRICING SLABS ---------- */
            if (v.pricingSlabs && v.pricingSlabs.length > 0) {
              const sortedSlabs = [...v.pricingSlabs].sort((a, b) => a.minQty - b.minQty);
              const slabData = sortedSlabs.map((slab) => ({
                variantId: variant.id,
                minQty: slab.minQty,
                maxQty: slab.maxQty || null,
                price: slab.price,
              }));
              await VariantPricingSlab.bulkCreate(slabData, { transaction: t });
            }

            /* ---------- CREATE IMAGES ---------- */
            const imgs = variantImagesMap[`tmp_${v.tempKey}`] || [];
            if (imgs.length > 0) {
              if (imgs.length > 5) {
                throw new Error(`Max 5 images allowed for variant ${variantIndex}`);
              }

              await VariantImage.bulkCreate(
                imgs.map((url, imgIndex) => ({
                  variantId: variant.id,
                  imageUrl: url,
                  isPrimary: imgIndex === 0,
                })),
                { transaction: t }
              );
              console.log(`Created ${imgs.length} images for new variant ${variant.id}`);
            }

            /* ---------- CREATE VARIANT ATTRIBUTES ---------- */
            if (Array.isArray(v.attributes) && v.attributes.length > 0) {
              const variantAttrRows = v.attributes.map((a) => ({
                productId: product.id,
                variantId: variant.id,
                attributeKey: String(a.attributeKey).substring(0, 255),
                attributeValue: String(a.attributeValue).substring(0, 500),
              }));
              await ProductAttribute.bulkCreate(variantAttrRows, { transaction: t });
            }

            /* ---------- CREATE VARIANT MEASUREMENTS ---------- */
            if (Array.isArray(v.measurements) && v.measurements.length > 0) {
              const variantMeasurementRows = v.measurements.map((m) => ({
                productId: product.id,
                variantId: variant.id,
                measurementId: m.measurementId,
                value: String(m.value).substring(0, 255),
              }));
              await ProductMeasurement.bulkCreate(variantMeasurementRows, { transaction: t });
            }
          }
        } catch (error) {
          throw new Error(`Variant ${variantIndex} failed: ${error.message}`);
        }
      }

      /* ---------- DELETE REMOVED VARIANTS ---------- */
      const toDelete = dbVariants.filter((v) => !incomingIds.has(v.id));

      if (toDelete.length > 0) {
        console.log("Variants to delete:", toDelete.map((v) => ({ id: v.id, code: v.variantCode })));

        for (const v of toDelete) {
          // Delete image files from storage
          if (v.images && v.images.length > 0) {
            for (const img of v.images) {
              const fullPath = path.join(__dirname, "../../", img.imageUrl);
              if (fs.existsSync(fullPath)) {
                try {
                  fs.unlinkSync(fullPath);
                  console.log(`Deleted image file for removed variant: ${fullPath}`);
                } catch (err) {
                  console.error(`Failed to delete image: ${fullPath}`, err);
                }
              }
            }
          }
        }

        const variantIds = toDelete.map((v) => v.id);

        // Delete all related data
        await ProductPrice.destroy({
          where: { variantId: { [Op.in]: variantIds } },
          transaction: t,
        });
        await VariantPricingSlab.destroy({
          where: { variantId: { [Op.in]: variantIds } },
          transaction: t,
        });
        await VariantImage.destroy({
          where: { variantId: { [Op.in]: variantIds } },
          transaction: t,
        });
        await ProductAttribute.destroy({
          where: { variantId: { [Op.in]: variantIds } },
          transaction: t,
        });
        await ProductMeasurement.destroy({
          where: { variantId: { [Op.in]: variantIds } },
          transaction: t,
        });
        await ProductVariant.destroy({
          where: { id: { [Op.in]: variantIds } },
          transaction: t,
        });

        console.log(`Deleted ${toDelete.length} variant(s)`);
      }
    }

    /* ---------------- UPDATE OFFERS ---------------- */
    if (appliedOffers !== undefined) {
      const parsedAppliedOffers = parseJSON(appliedOffers, "appliedOffers");

      if (parsedAppliedOffers && parsedAppliedOffers.length > 0) {
        validateArray(parsedAppliedOffers, "appliedOffers");

        parsedAppliedOffers.forEach((offer, index) => {
          if (!offer.offerId) {
            throw new Error(`offerId is required for appliedOffer at index ${index}`);
          }
          validateNumber(offer.offerId, `appliedOffers[${index}].offerId`, {
            required: true,
            isInteger: true,
            min: 1,
          });

          if (offer.subOfferId) {
            validateNumber(offer.subOfferId, `appliedOffers[${index}].subOfferId`, {
              isInteger: true,
              min: 1,
            });
          }
        });
      }

      await OfferApplicableProduct.destroy({
        where: { productId: product.id },
        transaction: t,
      });

      if (parsedAppliedOffers && parsedAppliedOffers.length > 0) {
        await OfferApplicableProduct.bulkCreate(
          parsedAppliedOffers.map((o) => ({
            productId: product.id,
            offerId: o.offerId,
            subOfferId: o.subOfferId,
          })),
          { transaction: t, validate: true }
        );
      }
    }

    /* ---------------- REGENERATE SKU IF NEEDED ---------------- */
    if (title !== undefined || categoryId !== undefined || 
        subCategoryId !== undefined || productCategoryId !== undefined) {
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