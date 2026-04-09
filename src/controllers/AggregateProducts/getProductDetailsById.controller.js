// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");

// const Offer = require("../../models/offers/offer.model");
// const OfferSub = require("../../models/offers/offerSub.model");
// const OfferApplicableCategory = require("../../models/offers/offerApplicableCategory.model");
// const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

// const {
//   Category,
//   SubCategory,
//   ProductCategory,
//   ProductRating,
//   ProductReview,
// } = require("../../models");

// exports.getProductById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const product = await Product.findByPk(id, {
//       attributes: [
//         "id",
//         "sku",
//         "title",
//         "description",
//         "brandName",
//         "badge",
//         "gstRate",
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
//               attributes: ["id", "length", "stock", "diameter"],
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

//     const productData = product.toJSON();
// // format sizes properly
// productData.variants = productData.variants.map((variant) => {
//   variant.sizes = variant.sizes.map((size) => ({
//     id: size.id,
//     diameter: size.diameter,
//     length: size.length,
//     stock: size.stock,

//     // 🔥 what frontend needs
//     display: `M${size.diameter} × ${size.length}`,
//     value: `${size.diameter}-${size.length}`,
//   }));

//   return variant;
// });

//     return res.json({
//       success: true,
//       data: productData,
//     });
//   } catch (error) {
//     console.error("GET PRODUCT ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
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
// const Wishlist = require("../../models/wishlist.model");

// const Offer = require("../../models/offers/offer.model");
// const OfferSub = require("../../models/offers/offerSub.model");
// const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

// const {
//   Category,
//   SubCategory,
//   ProductCategory,
//   ProductRating,
//   ProductReview,
//   StoreInventory
// } = require("../../models");

// exports.getProductById = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const { id } = req.params;
//     const { storeId } = req.query;

//     if (!storeId) {
//       return res.status(400).json({
//         success: false,
//         message: "storeId is required",
//       });
//     }

//     /* ---------------- FETCH PRODUCT ---------------- */
//     const product = await Product.findByPk(id, {
//       attributes: [
//         "id",
//         "sku",
//         "title",
//         "description",
//         "brandName",
//         "badge",
//         "gstRate",
//         "isActive",
//         "createdAt",
//         "updatedAt",
//       ],
//       include: [
//         { model: Category, as: "Category", attributes: ["id", "name"] },
//         { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
//         {
//           model: ProductCategory,
//           as: "ProductCategory",
//           attributes: ["id", "name"],
//         },
//         {
//           model: ProductSpec,
//           as: "specs",
//           attributes: ["id", "specKey", "specValue"],
//         },
//         {
//           model: ProductRating,
//           as: "rating",
//         },
//         {
//           model: ProductReview,
//           as: "reviews",
//         },
//         {
//           model: ProductVariant,
//           as: "variants",
//           attributes: [
//             "id",
//             "variantCode",
//             "packQuantity",
//             "finish",
//             "grade",
//             "material",
//             "threadType",
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
//               attributes: ["id", "length", "diameter", "approxWeightKg"],
//             },
//             {
//               model: ProductPrice,
//               as: "price",
//               attributes: [
//                 "id",
//                 "mrp",
//                 "sellingPrice",
//                 "discountPercentage",
//                 "currency",
//               ],
//             },
//           ],
//         },
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
//                     "minOrderValue",
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

//     /* ---------------- STORE INVENTORY ---------------- */
//     const inventory = await StoreInventory.findAll({
//       where: { storeId },
//     });

//     const inventoryMap = {};
//     inventory.forEach((inv) => {
//       const key = `${inv.variantId}-${inv.variantSizeId}`;
//       inventoryMap[key] = inv.stock;
//     });

//     /* ---------------- WISHLIST ---------------- */
//     let wishlistedVariants = [];

//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId, productId: id },
//         attributes: ["variantId"],
//       });

//       wishlistedVariants = wishlist.map((w) => w.variantId);
//     }

//     /* ---------------- FINAL FORMAT ---------------- */
//     const productData = product.toJSON();

//     productData.variants = productData.variants.map((variant) => {
//       let variantTotalStock = 0;

//       const mrp = variant.price?.mrp || 0;
//       const sellingPrice = variant.price?.sellingPrice || 0;
//       const gstRate = productData.gstRate || 0;

//       const gstAmount = (sellingPrice * gstRate) / 100;
//       const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);

//       const discount = mrp > 0 ? mrp - sellingPrice : 0;
//       const discountPercentage =
//         mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

//       const sizes = variant.sizes.map((size) => {
//         const key = `${variant.id}-${size.id}`;
//         const stock = inventoryMap[key] || 0;

//         variantTotalStock += stock;

//         return {
//           id: size.id,
//           diameter: size.diameter,
//           length: size.length,
//           approxWeightKg: size.approxWeightKg,

//           stock,
//           isAvailable: stock > 0,

//           display:
//             size.diameter && size.length
//               ? `M${size.diameter} × ${size.length}`
//               : size.diameter
//                 ? `D${size.diameter}`
//                 : size.length
//                   ? `L${size.length}`
//                   : "Standard",

//           value:
//             size.diameter && size.length
//               ? `${size.diameter}-${size.length}`
//               : size.diameter
//                 ? `${size.diameter}`
//                 : size.length
//                   ? `${size.length}`
//                   : "std",
//         };
//       });

//       return {
//         ...variant,
//         sizes,
//         totalStock: variantTotalStock,
//         stockStatus: variantTotalStock > 0 ? "In Stock" : "Out of Stock",

//         isWishlisted: wishlistedVariants.includes(variant.id),

//         price: {
//           ...(variant.price?.toJSON?.() || {}),

//           mrp,
//           sellingPrice,
//           gstRate,

//           gstAmount: Math.round(gstAmount),
//           gstInclusiveAmount,

//           discount,
//           discountPercentage,
//         },
//       };
//     });

//     return res.json({
//       success: true,
//       data: {
//         ...productData,
//         isWishlisted: wishlistedVariants.length > 0,
//         wishlistedVariants,
//       },
//     });
//   } catch (error) {
//     console.error("GET PRODUCT DETAILS ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };





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
            "id", "variantCode", "unit", "moq", "packingType",
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