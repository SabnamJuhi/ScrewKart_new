
// const { Op } = require("sequelize");
// const { sequelize } = require("../../models"); // Import sequelize instance

// const Product = require("../../models/products/product.model");
// const Category = require("../../models/category/category.model");
// const SubCategory = require("../../models/category/subcategory.model");
// const ProductCategory = require("../../models/category/productCategory.model");

// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");

// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");

// const Offer = require("../../models/offers/offer.model");
// const Wishlist = require("../../models/wishlist.model");
// const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");
// const { OfferSub } = require("../../models");
// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

// exports.searchProducts = async (req, res) => {
//   try {
//     const { keyword } = req.query;
//     const paginationOptions = getPaginationOptions(req.query);
//     const userId = req.user?.id || null;

//     if (!keyword) {
//       return res.status(400).json({
//         success: false,
//         message: "Search keyword is required",
//       });
//     }

//     /* ======================================================
//        STEP 1: Get Paginated Product IDs Only
//     ====================================================== */

//     const { count, rows } = await Product.findAndCountAll({
//       attributes: ["id"],
//       where: {
//         isActive: true,
//         [Op.or]: [
//           // For MySQL, use LOWER() function for case-insensitive search
//           sequelize.where(sequelize.fn('LOWER', sequelize.col('title')), {
//             [Op.like]: `%${keyword.toLowerCase()}%`
//           }),
//           sequelize.where(sequelize.fn('LOWER', sequelize.col('Category.name')), {
//             [Op.like]: `%${keyword.toLowerCase()}%`
//           }),
//           sequelize.where(sequelize.fn('LOWER', sequelize.col('SubCategory.name')), {
//             [Op.like]: `%${keyword.toLowerCase()}%`
//           }),
//           sequelize.where(sequelize.fn('LOWER', sequelize.col('ProductCategory.name')), {
//             [Op.like]: `%${keyword.toLowerCase()}%`
//           }),
//         ],
//       },
//       include: [
//         { model: Category, attributes: [] },
//         { model: SubCategory, attributes: [] },
//         { model: ProductCategory, attributes: [] },
//       ],
//       distinct: true,
//       subQuery: false,
//       order: [["createdAt", "DESC"]],
//       ...paginationOptions,
//     });

//     const productIds = rows.map((p) => p.id);

//     if (!productIds.length) {
//       return res.json({
//         success: true,
//         data: [],
//         pagination: {
//           totalItems: 0,
//           totalPages: 0,
//           currentPage: paginationOptions.currentPage,
//           pageSize: paginationOptions.limit,
//           hasNextPage: false,
//           hasPreviousPage: false,
//         },
//       });
//     }

//     /* ======================================================
//        STEP 2: Fetch Full Product Data
//     ====================================================== */

//     const products = await Product.findAll({
//       where: { id: productIds, isActive: true },
//       include: [
//         {
//           model: Category,
//           attributes: ["id", "name"],
//         },
//         {
//           model: SubCategory,
//           attributes: ["id", "name"],
//         },
//         {
//           model: ProductCategory,
//           attributes: ["id", "name"],
//         },
//         {
//           model: ProductSpec,
//           as: "specs",
//         },
//         {
//           model: ProductVariant,
//           as: "variants",
//           where: { isActive: true },
//           required: false,
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//             },
//             {
//               model: VariantSize,
//               as: "sizes",
//               attributes: ["id", "diameter", "length", "stock", "approxWeightKg"],
//             },
//             {
//               model: ProductPrice,
//               as: "price",
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
//                   ],
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     /* ======================================================
//        STEP 3: Wishlist Logic
//     ====================================================== */

//     let wishlistData = [];
//     if (userId) {
//       wishlistData = await Wishlist.findAll({
//         where: { userId },
//         attributes: ["productId", "variantId"],
//       });
//     }

//     const formattedProducts = products.map((product) => {
//       const productJSON = product.toJSON();

//       // Format sizes display
//       if (productJSON.variants) {
//         productJSON.variants.forEach((variant) => {
//           if (variant.sizes) {
//             variant.sizes = variant.sizes.map((size) => ({
//               ...size,
//               displaySize: `M${size.diameter} × ${size.length}`,
//             }));
//           }
//         });
//       }

//       const isWishlisted = wishlistData.some(
//         (item) => item.productId === product.id,
//       );

//       const wishlistedVariants = wishlistData
//         .filter((item) => item.productId === product.id)
//         .map((item) => item.variantId);

//       return {
//         ...productJSON,
//         isWishlisted,
//         wishlistedVariants,
//       };
//     });

//     /* ======================================================
//        FINAL PAGINATED RESPONSE
//     ====================================================== */

//     const response = formatPagination(
//       { count, rows: formattedProducts },
//       paginationOptions.currentPage,
//       paginationOptions.limit,
//     );

//     return res.json({
//       success: true,
//       ...response,
//     });
//   } catch (error) {
//     console.error("Search Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Search failed",
//     });
//   }
// };




const { Op } = require("sequelize");
const { sequelize } = require("../../models");

const Product = require("../../models/products/product.model");
const Category = require("../../models/category/category.model");
const SubCategory = require("../../models/category/subcategory.model");
const ProductCategory = require("../../models/category/productCategory.model");
const ProductAttribute = require("../../models/products/productAttribute.model");
const ProductMeasurement = require("../../models/products/productMeasurement.model");
const MeasurementMaster = require("../../models/measurements/measurementMaster.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const Offer = require("../../models/offers/offer.model");
const Wishlist = require("../../models/wishlist.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");
const { OfferSub, StoreInventory } = require("../../models");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.searchProducts = async (req, res) => {
  try {
    const { keyword, storeId } = req.query;
    const paginationOptions = getPaginationOptions(req.query);
    const userId = req.user?.id || null;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Search keyword is required",
      });
    }

    /* ======================================================
       STEP 1: Get Paginated Product IDs Only
    ====================================================== */

    const { count, rows } = await Product.findAndCountAll({
      attributes: ["id"],
      where: {
        isActive: true,
        [Op.or]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.col('title')), {
            [Op.like]: `%${keyword.toLowerCase()}%`
          }),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('Category.name')), {
            [Op.like]: `%${keyword.toLowerCase()}%`
          }),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('SubCategory.name')), {
            [Op.like]: `%${keyword.toLowerCase()}%`
          }),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('ProductCategory.name')), {
            [Op.like]: `%${keyword.toLowerCase()}%`
          }),
        ],
      },
      include: [
        { model: Category, attributes: [] },
        { model: SubCategory, attributes: [] },
        { model: ProductCategory, attributes: [] },
      ],
      distinct: true,
      subQuery: false,
      order: [["createdAt", "DESC"]],
      ...paginationOptions,
    });

    const productIds = rows.map((p) => p.id);

    if (!productIds.length) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: paginationOptions.currentPage,
          pageSize: paginationOptions.limit,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    /* ======================================================
       STEP 2: Fetch Full Product Data (Same as getAllProductsDetails)
    ====================================================== */

    const products = await Product.findAll({
      where: { id: productIds, isActive: true },
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
        { model: ProductCategory, as: "ProductCategory", attributes: ["id", "name"] },
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
      order: [["createdAt", "DESC"]],
    });

    /* ======================================================
       STEP 3: Store Inventory (Optional)
    ====================================================== */

    let inventoryMap = {};

    if (storeId) {
      // Get all variant IDs from products
      const allVariants = products.flatMap(product => 
        product.variants?.map(v => v.id) || []
      );
      const variantIds = [...new Set(allVariants)];

      if (variantIds.length > 0) {
        const inventory = await StoreInventory.findAll({
          where: { storeId, variantId: variantIds },
        });

        inventory.forEach((inv) => {
          inventoryMap[inv.variantId] = inv.stock;
        });
      }
    }

    /* ======================================================
       STEP 4: Wishlist Logic
    ====================================================== */

    let wishlistData = [];
    let wishlistedMap = {};

    if (userId) {
      wishlistData = await Wishlist.findAll({
        where: { userId },
        attributes: ["productId", "variantId"],
      });

      wishlistData.forEach((w) => {
        if (!wishlistedMap[w.productId]) {
          wishlistedMap[w.productId] = [];
        }
        wishlistedMap[w.productId].push(w.variantId);
      });
    }

    /* ======================================================
       STEP 5: Format Response (Same as getAllProductsDetails)
    ====================================================== */

    const formattedProducts = products.map((product) => {
      const productJSON = product.toJSON();

      // Format Product Level Attributes
      const productAttributes = {};
      (productJSON.attributes || []).forEach((attr) => {
        productAttributes[attr.attributeKey] = attr.attributeValue;
      });

      // Format Product Level Measurements
      const productMeasurements = {};
      (productJSON.measurements || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        productMeasurements[label] = `${m.value}${unit}`;
      });

      // Format Variants
      productJSON.variants = (productJSON.variants || []).map((variant) => {
        // Use inventory stock if storeId provided, otherwise use variant's totalStock
        const stock = storeId 
          ? (inventoryMap[variant.id] || 0) 
          : (variant.totalStock || 0);

        // Format Variant Level Attributes
        const variantAttributes = {};
        (variant.attributes || []).forEach((attr) => {
          variantAttributes[attr.attributeKey] = attr.attributeValue;
        });

        // Format Variant Level Measurements
        const variantMeasurements = {};
        (variant.measurements || []).forEach((m) => {
          const label = m.measurement?.name || `ID_${m.measurementId}`;
          const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
          variantMeasurements[label] = `${m.value}${unit}`;
        });

        // Price Calculations with GST
        const mrp = variant.price?.mrp || 0;
        const sellingPrice = variant.price?.sellingPrice || 0;
        const gstRate = parseFloat(productJSON.gstRate) || 0;

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
        ...productJSON,
        attributes: productAttributes,
        measurements: productMeasurements,
        isWishlisted: !!wishlistedMap[productJSON.id],
        wishlistedVariants: wishlistedMap[productJSON.id] || [],
      };
    });

    /* ======================================================
       FINAL PAGINATED RESPONSE
    ====================================================== */

    const response = formatPagination(
      { count, rows: formattedProducts },
      paginationOptions.currentPage,
      paginationOptions.limit,
    );

    return res.json({
      success: true,
      ...response,
    });

  } catch (error) {
    console.error("Search Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Search failed",
    });
  }
};