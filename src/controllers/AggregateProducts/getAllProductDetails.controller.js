
const sequelize = require("../../config/db");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");

const ProductAttribute = require("../../models/products/ProductAttribute.model");
const ProductMeasurement = require("../../models/products/ProductMeasurement.model");
const MeasurementMaster = require("../../models/measurements/MeasurementMaster.model");

const Offer = require("../../models/offers/offer.model");
const OfferSub = require("../../models/offers/offerSub.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

const Wishlist = require("../../models/wishlist.model");

const {
  Category,
  SubCategory,
  ProductCategory,
  StoreInventory,
} = require("../../models");

const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.getAllProductsDetails = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "storeId is required",
      });
    }

    const paginationOptions = getPaginationOptions(req.query);

    /* ---------------- FILTER ---------------- */
    const productWhere = {};
    if (req.query.isActive !== undefined) {
      productWhere.isActive = req.query.isActive === "true";
    }

    /* ---------------- FETCH PRODUCTS ---------------- */
    const products = await Product.findAndCountAll({
      where: productWhere,
      attributes: [
        "id",
        "sku",
        "title",
        "description",
        "brandName",
        "badge",
        "gstRate",
        "isActive",
        "createdAt",
      ],
      include: [
        { model: Category, as: "Category", attributes: ["id", "name"] },
        { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
        {
          model: ProductCategory,
          as: "ProductCategory",
          attributes: ["id", "name"],
        },
        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id",
            "variantCode",
            "unit",
            "moq",
            "packingType",
            "packQuantity",
            "dispatchType",
            "deliverySla",
            "isActive",
            "totalStock",
            "stockStatus",
          ],
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
            },
            {
              model: ProductPrice,
              as: "price",
              attributes: [
                "id",
                "mrp",
                "sellingPrice",
                "discountPercentage",
                "currency",
              ],
            },
            {
              model: ProductAttribute,
              as: "attributes",
              attributes: ["attributeKey", "attributeValue"],
              required: false,
            },
            {
              model: ProductMeasurement,
              as: "measurements",
              attributes: ["measurementId", "value"],
              include: [
                {
                  model: MeasurementMaster,
                  as: "measurement",
                  attributes: ["id", "name", "unit"],
                },
              ],
            },
          ],
        },
        {
          model: ProductAttribute,
          as: "attributes",
          attributes: ["attributeKey", "attributeValue"],
          required: false,
        },
        {
          model: ProductMeasurement,
          as: "measurements",
          attributes: ["measurementId", "value"],
          include: [
            {
              model: MeasurementMaster,
              as: "measurement",
              attributes: ["id", "name", "unit"],
            },
          ],
        },
        {
          model: OfferApplicableProduct,
          as: "offerApplicableProducts",
          attributes: ["id", "offerId", "subOfferId"],
          include: [
            {
              model: Offer,
              as: "offerDetails",
              attributes: [
                "id",
                "offerCode",
                "title",
                "festival",
                "description",
                "startDate",
                "endDate",
                "isActive",
              ],
              include: [
                {
                  model: OfferSub,
                  as: "subOffers",
                  attributes: [
                    "id",
                    "discountType",
                    "discountValue",
                    "maxDiscount",
                    "minOrderValue",
                  ],
                },
              ],
            },
          ],
        },
      ],
      distinct: true,
      order: [["createdAt", "DESC"]],
      ...paginationOptions,
    });

    /* ---------------- STORE INVENTORY ---------------- */
    const inventory = await StoreInventory.findAll({
      where: { storeId },
    });

    const inventoryMap = {};
    inventory.forEach((inv) => {
      inventoryMap[inv.variantId] = inv.stock;
    });

    /* ---------------- WISHLIST ---------------- */
    let wishlistedMap = {};

    if (userId) {
      const wishlist = await Wishlist.findAll({
        where: { userId },
        attributes: ["productId", "variantId"],
      });

      wishlist.forEach((w) => {
        if (!wishlistedMap[w.productId]) {
          wishlistedMap[w.productId] = [];
        }
        wishlistedMap[w.productId].push(w.variantId);
      });
    }

    /* ---------------- FORMAT RESPONSE ---------------- */
const finalProducts = products.rows.map((p) => {
  const product = p.toJSON();

  // 🔥 Format Product Level Attributes
  const productAttributes = {};
  (product.attributes || []).forEach((attr) => {
    productAttributes[attr.attributeKey] = attr.attributeValue;
  });

  // 🔥 Format Product Level Measurements
  const productMeasurements = {};
  (product.measurements || []).forEach((m) => {
    // Uses the name from MeasurementMaster (e.g., "Length") 
    // and appends unit if available (e.g., "20 mm")
    const label = m.measurement?.name || `ID_${m.measurementId}`;
    const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
    productMeasurements[label] = `${m.value}${unit}`;
  });

  product.variants = product.variants.map((variant) => {
    const stock = inventoryMap[variant.id] || 0;

    // 🔥 Format Variant Level Attributes
    const variantAttributes = {};
    (variant.attributes || []).forEach((attr) => {
      variantAttributes[attr.attributeKey] = attr.attributeValue;
    });

    // 🔥 Format Variant Level Measurements
    const variantMeasurements = {};
    (variant.measurements || []).forEach((m) => {
      const label = m.measurement?.name || `ID_${m.measurementId}`;
      const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
      variantMeasurements[label] = `${m.value}${unit}`;
    });

    // 🔥 PRICE CALCULATIONS
    const mrp = variant.price?.mrp || 0;
    const sellingPrice = variant.price?.sellingPrice || 0;
    const gstRate = parseFloat(product.gstRate) || 0;

    const gstAmount = (sellingPrice * gstRate) / 100;
    const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);

    const discount = mrp > 0 ? mrp - sellingPrice : 0;
    const discountPercentage = mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

    return {
      ...variant,
      stock,
      isAvailable: stock > 0,
      totalStock: stock,
      stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
      attributes: variantAttributes,
      measurements: variantMeasurements,
      price: {
        ...(variant.price || {}),
        mrp,
        sellingPrice,
        gstRate,
        gstAmount: Math.round(gstAmount),
        gstInclusiveAmount,
        discount,
        discountPercentage,
      },
    };
  });

  return {
    ...product,
    attributes: productAttributes,
    measurements: productMeasurements,
    isWishlisted: !!wishlistedMap[product.id],
    wishlistedVariants: wishlistedMap[product.id] || [],
  };
});

    const response = formatPagination(
      { count: products.count, rows: finalProducts },
      paginationOptions.currentPage,
      paginationOptions.limit,
    );

    return res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
