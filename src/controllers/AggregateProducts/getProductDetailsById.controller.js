
const sequelize = require("../../config/db");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");

const ProductAttribute = require("../../models/products/productAttribute.model");
const ProductMeasurement = require("../../models/products/productMeasurement.model");
const MeasurementMaster = require("../../models/measurements/measurementMaster.model");

const Offer = require("../../models/offers/offer.model");
const OfferSub = require("../../models/offers/offerSub.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

const Wishlist = require("../../models/wishlist.model");

const {
  Category,
  SubCategory,
  ProductCategory,
  ProductRating,
  ProductReview,
  StoreInventory,
} = require("../../models");

exports.getProductById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "storeId is required",
      });
    }

    /* ---------------- FETCH PRODUCT ---------------- */
    const productRecord = await Product.findByPk(id, {
      attributes: [
        "id", "sku", "title", "description", "brandName",
        "badge", "gstRate", "isActive", "createdAt", "updatedAt",
      ],
      include: [
        { model: Category, as: "Category", attributes: ["id", "name"] },
        { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
        { model: ProductCategory, as: "ProductCategory", attributes: ["id", "name"] },
        { model: ProductRating, as: "rating" },
        { model: ProductReview, as: "reviews" },
        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id", "variantCode", "unit", "moq", "packingType","packQuantity",
            "dispatchType", "deliverySla", "isActive", "totalStock", "stockStatus",
          ],
          include: [
            { model: VariantImage, as: "images", attributes: ["id", "imageUrl"] },
            {
              model: ProductPrice,
              as: "price",
              attributes: ["id", "mrp", "sellingPrice", "discountPercentage", "currency"],
            },
            {
              model: ProductAttribute,
              as: "attributes",
              attributes: ["attributeKey", "attributeValue"],
            },
            {
              model: ProductMeasurement,
              as: "measurements",
              attributes: ["measurementId", "value"],
              include: [{ model: MeasurementMaster, as: "measurement", attributes: ["name", "unit"] }],
            },
          ],
        },
        {
          model: ProductAttribute,
          as: "attributes",
          attributes: ["attributeKey", "attributeValue"],
        },
        {
          model: ProductMeasurement,
          as: "measurements",
          attributes: ["measurementId", "value"],
          include: [{ model: MeasurementMaster, as: "measurement", attributes: ["name", "unit"] }],
        },
        {
          model: OfferApplicableProduct,
          as: "offerApplicableProducts",
          attributes: ["id", "offerId", "subOfferId"],
          include: [
            {
              model: Offer,
              as: "offerDetails",
              attributes: ["id", "offerCode", "title", "description", "isActive"],
              include: [{ model: OfferSub, as: "subOffers" }],
            },
          ],
        },
      ],
    });

    if (!productRecord) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    /* ---------------- STORE INVENTORY ---------------- */
    const inventory = await StoreInventory.findAll({ where: { storeId } });
    const inventoryMap = {};
    inventory.forEach((inv) => {
      inventoryMap[inv.variantId] = inv.stock;
    });

    /* ---------------- WISHLIST ---------------- */
    let wishlistedVariants = [];
    if (userId) {
      const wishlist = await Wishlist.findAll({
        where: { userId, productId: id },
        attributes: ["variantId"],
      });
      wishlistedVariants = wishlist.map((w) => w.variantId);
    }

    /* ---------------- FINAL FORMATTING ---------------- */
    const product = productRecord.toJSON();

    // 🔥 Helper for Attributes/Measurements formatting
    const formatAttributes = (arr) => {
      const obj = {};
      (arr || []).forEach((item) => { obj[item.attributeKey] = item.attributeValue; });
      return obj;
    };

    const formatMeasurements = (arr) => {
      const obj = {};
      (arr || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        obj[label] = `${m.value}${unit}`;
      });
      return obj;
    };

    const productAttributes = formatAttributes(product.attributes);
    const productMeasurements = formatMeasurements(product.measurements);

    product.variants = product.variants.map((variant) => {
      const stock = inventoryMap[variant.id] || 0;

      // Price Calculations
      const mrp = variant.price?.mrp || 0;
      const sellingPrice = variant.price?.sellingPrice || 0;
      const gstRate = parseFloat(product.gstRate) || 0;
      const gstAmount = (sellingPrice * gstRate) / 100;

      return {
        ...variant,
        stock,
        isAvailable: stock > 0,
        totalStock: stock,
        stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
        isWishlisted: wishlistedVariants.includes(variant.id),
        attributes: formatAttributes(variant.attributes),
        measurements: formatMeasurements(variant.measurements),
        price: {
          ...(variant.price || {}),
          mrp,
          sellingPrice,
          gstRate,
          gstAmount: Math.round(gstAmount),
          gstInclusiveAmount: Math.round(sellingPrice + gstAmount),
          discount: mrp > 0 ? mrp - sellingPrice : 0,
          discountPercentage: mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
        },
      };
    });

    return res.json({
      success: true,
      data: {
        ...product,
        attributes: productAttributes,
        measurements: productMeasurements,
        isWishlisted: wishlistedVariants.length > 0,
        wishlistedVariants,
      },
    });
  } catch (error) {
    console.error("GET PRODUCT BY ID ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};