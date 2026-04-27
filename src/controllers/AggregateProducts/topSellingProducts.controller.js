// const {
//   Product,
//   OrderItem,
//   Category,
//   SubCategory,
//   ProductCategory,
//   ProductVariant,
//   VariantImage,
//   ProductPrice,
//   ProductAttribute,
//   ProductMeasurement,
//   MeasurementMaster,
//   OfferApplicableProduct,
//   Offer,
//   OfferSub,
//   StoreInventory,
//   Order
// } = require("../../models");
// const { Sequelize } = require("sequelize");
// const sequelize = require("../../config/db");
// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

// exports.getTopSellingProducts = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const { storeId } = req.query;
    
//     if (!storeId) {
//       return res.status(400).json({
//         success: false,
//         message: "storeId is required",
//       });
//     }

//     // Get pagination options from request query
//     const paginationOptions = getPaginationOptions(req.query);
//     const limit = paginationOptions.limit;
//     const currentPage = paginationOptions.currentPage;
//     const offset = (currentPage - 1) * limit;

//     // Step 1: Get total count and top selling product IDs with pagination
//     // First, get the total count of products that have sales
//     const totalSalesCountResult = await OrderItem.findAll({
//       attributes: [
//         "productId",
//         [sequelize.fn("SUM", sequelize.col("OrderItem.quantity")), "totalSold"],
//       ],
//       include: [
//         {
//           model: Order,
//           as: "Order",
//           where: { storeId },
//           required: true,
//           attributes: [],
//         },
//       ],
//       group: ["productId"],
//       raw: true,
//     });

//     const totalCount = totalSalesCountResult.length;
    
//     // Get paginated product IDs based on sales
//     const topProductsData = await OrderItem.findAll({
//       attributes: [
//         "productId",
//         [sequelize.fn("SUM", sequelize.col("OrderItem.quantity")), "totalSold"],
//       ],
//       include: [
//         {
//           model: Order,
//           as: "Order",
//           where: { storeId },
//           required: true,
//           attributes: [],
//         },
//       ],
//       group: ["productId"],
//       order: [[sequelize.literal("totalSold"), "DESC"]],
//       limit,
//       offset,
//       raw: true,
//     });

//     const topProductIds = topProductsData.map(item => item.productId);
    
//     // Create a map of productId to totalSold for quick lookup
//     const salesDataMap = {};
//     topProductsData.forEach(item => {
//       salesDataMap[item.productId] = parseInt(item.totalSold);
//     });

//     // If no sales data, fallback to recent products with pagination
//     if (topProductIds.length === 0) {
//       return await getFallbackProducts(req, res, storeId, userId, paginationOptions);
//     }

//     // If we have fewer products than limit, we don't need to fetch additional products
//     // since we're already paginating through top-selling products only
    
//     /* ---------------- FETCH PRODUCTS WITH FULL DETAILS ---------------- */
//     const products = await Product.findAndCountAll({
//       where: { id: { [Sequelize.Op.in]: topProductIds } },
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
//           model: ProductVariant,
//           as: "variants",
//           attributes: [
//             "id",
//             "variantCode",
//             "unit",
//             "moq",
//             "packingType",
//             "packQuantity",
//             "dispatchType",
//             "deliverySla",
//             "isActive",
//             "totalStock",
//             "stockStatus",
//           ],
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
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
//             {
//               model: ProductAttribute,
//               as: "attributes",
//               attributes: ["attributeKey", "attributeValue"],
//               required: false,
//             },
//             {
//               model: ProductMeasurement,
//               as: "measurements",
//               attributes: ["measurementId", "value"],
//               include: [
//                 {
//                   model: MeasurementMaster,
//                   as: "measurement",
//                   attributes: ["id", "name", "unit"],
//                 },
//               ],
//             },
//           ],
//         },
//         {
//           model: ProductAttribute,
//           as: "attributes",
//           attributes: ["attributeKey", "attributeValue"],
//           required: false,
//         },
//         {
//           model: ProductMeasurement,
//           as: "measurements",
//           attributes: ["measurementId", "value"],
//           include: [
//             {
//               model: MeasurementMaster,
//               as: "measurement",
//               attributes: ["id", "name", "unit"],
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
//       distinct: true,
//     });

//     // Reorder products based on top selling order
//     const orderedProducts = [];
//     for (const id of topProductIds) {
//       const product = products.rows.find(p => p.id === id);
//       if (product) {
//         orderedProducts.push(product);
//       }
//     }

//     /* ---------------- STORE INVENTORY ---------------- */
//     const inventory = await StoreInventory.findAll({
//       where: { storeId },
//     });

//     const inventoryMap = {};
//     inventory.forEach((inv) => {
//       inventoryMap[inv.variantId] = inv.stock;
//     });

//     /* ---------------- WISHLIST ---------------- */
//     let wishlistedMap = {};

//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId },
//         attributes: ["productId", "variantId"],
//       });

//       wishlist.forEach((w) => {
//         if (!wishlistedMap[w.productId]) {
//           wishlistedMap[w.productId] = [];
//         }
//         wishlistedMap[w.productId].push(w.variantId);
//       });
//     }

//     /* ---------------- FORMAT RESPONSE ---------------- */
//     const finalProducts = orderedProducts.map((p) => {
//       const product = p.toJSON();

//       // Format Product Level Attributes
//       const productAttributes = {};
//       (product.attributes || []).forEach((attr) => {
//         productAttributes[attr.attributeKey] = attr.attributeValue;
//       });

//       // Format Product Level Measurements
//       const productMeasurements = {};
//       (product.measurements || []).forEach((m) => {
//         const label = m.measurement?.name || `ID_${m.measurementId}`;
//         const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
//         productMeasurements[label] = `${m.value}${unit}`;
//       });

//       product.variants = product.variants.map((variant) => {
//         const stock = inventoryMap[variant.id] || 0;

//         // Format Variant Level Attributes
//         const variantAttributes = {};
//         (variant.attributes || []).forEach((attr) => {
//           variantAttributes[attr.attributeKey] = attr.attributeValue;
//         });

//         // Format Variant Level Measurements
//         const variantMeasurements = {};
//         (variant.measurements || []).forEach((m) => {
//           const label = m.measurement?.name || `ID_${m.measurementId}`;
//           const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
//           variantMeasurements[label] = `${m.value}${unit}`;
//         });

//         // PRICE CALCULATIONS
//         const mrp = variant.price?.mrp || 0;
//         const sellingPrice = variant.price?.sellingPrice || 0;
//         const gstRate = parseFloat(product.gstRate) || 0;

//         const gstAmount = (sellingPrice * gstRate) / 100;
//         const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);

//         const discount = mrp > 0 ? mrp - sellingPrice : 0;
//         const discountPercentage = mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

//         return {
//           ...variant,
//           stock,
//           isAvailable: stock > 0,
//           totalStock: stock,
//           stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
//           attributes: variantAttributes,
//           measurements: variantMeasurements,
//           price: {
//             ...(variant.price || {}),
//             mrp,
//             sellingPrice,
//             gstRate,
//             gstAmount: Math.round(gstAmount),
//             gstInclusiveAmount,
//             discount,
//             discountPercentage,
//           },
//         };
//       });

//       return {
//         ...product,
//         attributes: productAttributes,
//         measurements: productMeasurements,
//         isWishlisted: !!wishlistedMap[product.id],
//         wishlistedVariants: wishlistedMap[product.id] || [],
//         totalSold: salesDataMap[product.id] || 0,
//       };
//     });

//     // Use the same pagination format as getAllProductsDetails
//     const response = formatPagination(
//       { count: totalCount, rows: finalProducts },
//       currentPage,
//       limit
//     );

//     return res.json({
//       success: true,
//       source: "top-selling",
//       ...response,
//     });

//   } catch (error) {
//     console.error("GET TOP SELLING PRODUCTS ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Helper function for fallback products with pagination
// async function getFallbackProducts(req, res, storeId, userId, paginationOptions) {
//   try {
//     const { limit, currentPage, offset } = paginationOptions;
    
//     // Get total count of active products
//     const totalCount = await Product.count({
//       where: { isActive: true },
//     });

//     // Get paginated products
//     const products = await Product.findAndCountAll({
//       where: { isActive: true },
//       limit,
//       offset,
//       order: [["createdAt", "DESC"]],
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
//           model: ProductVariant,
//           as: "variants",
//           attributes: [
//             "id",
//             "variantCode",
//             "unit",
//             "moq",
//             "packingType",
//             "packQuantity",
//             "dispatchType",
//             "deliverySla",
//             "isActive",
//             "totalStock",
//             "stockStatus",
//           ],
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
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
//             {
//               model: ProductAttribute,
//               as: "attributes",
//               attributes: ["attributeKey", "attributeValue"],
//               required: false,
//             },
//             {
//               model: ProductMeasurement,
//               as: "measurements",
//               attributes: ["measurementId", "value"],
//               include: [
//                 {
//                   model: MeasurementMaster,
//                   as: "measurement",
//                   attributes: ["id", "name", "unit"],
//                 },
//               ],
//             },
//           ],
//         },
//         {
//           model: ProductAttribute,
//           as: "attributes",
//           attributes: ["attributeKey", "attributeValue"],
//           required: false,
//         },
//         {
//           model: ProductMeasurement,
//           as: "measurements",
//           attributes: ["measurementId", "value"],
//           include: [
//             {
//               model: MeasurementMaster,
//               as: "measurement",
//               attributes: ["id", "name", "unit"],
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
//       distinct: true,
//     });

//     const inventory = await StoreInventory.findAll({
//       where: { storeId },
//     });

//     const inventoryMap = {};
//     inventory.forEach((inv) => {
//       inventoryMap[inv.variantId] = inv.stock;
//     });

//     let wishlistedMap = {};
//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId },
//         attributes: ["productId", "variantId"],
//       });

//       wishlist.forEach((w) => {
//         if (!wishlistedMap[w.productId]) {
//           wishlistedMap[w.productId] = [];
//         }
//         wishlistedMap[w.productId].push(w.variantId);
//       });
//     }

//     const finalProducts = products.rows.map((p) => {
//       const product = p.toJSON();

//       const productAttributes = {};
//       (product.attributes || []).forEach((attr) => {
//         productAttributes[attr.attributeKey] = attr.attributeValue;
//       });

//       const productMeasurements = {};
//       (product.measurements || []).forEach((m) => {
//         const label = m.measurement?.name || `ID_${m.measurementId}`;
//         const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
//         productMeasurements[label] = `${m.value}${unit}`;
//       });

//       product.variants = product.variants.map((variant) => {
//         const stock = inventoryMap[variant.id] || 0;

//         const variantAttributes = {};
//         (variant.attributes || []).forEach((attr) => {
//           variantAttributes[attr.attributeKey] = attr.attributeValue;
//         });

//         const variantMeasurements = {};
//         (variant.measurements || []).forEach((m) => {
//           const label = m.measurement?.name || `ID_${m.measurementId}`;
//           const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
//           variantMeasurements[label] = `${m.value}${unit}`;
//         });

//         const mrp = variant.price?.mrp || 0;
//         const sellingPrice = variant.price?.sellingPrice || 0;
//         const gstRate = parseFloat(product.gstRate) || 0;

//         const gstAmount = (sellingPrice * gstRate) / 100;
//         const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);

//         const discount = mrp > 0 ? mrp - sellingPrice : 0;
//         const discountPercentage =
//           mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

//         return {
//           ...variant,
//           stock,
//           isAvailable: stock > 0,
//           totalStock: stock,
//           stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
//           attributes: variantAttributes,
//           measurements: variantMeasurements,
//           price: {
//             ...(variant.price || {}),
//             mrp,
//             sellingPrice,
//             gstRate,
//             gstAmount: Math.round(gstAmount),
//             gstInclusiveAmount,
//             discount,
//             discountPercentage,
//           },
//         };
//       });

//       return {
//         ...product,
//         attributes: productAttributes,
//         measurements: productMeasurements,
//         isWishlisted: !!wishlistedMap[product.id],
//         wishlistedVariants: wishlistedMap[product.id] || [],
//         totalSold: 0,
//       };
//     });

//     // Use the same pagination format as getAllProductsDetails
//     const response = formatPagination(
//       { count: totalCount, rows: finalProducts },
//       currentPage,
//       limit
//     );

//     return res.json({
//       success: true,
//       source: "fallback",
//       ...response,
//     });
//   } catch (error) {
//     console.error("FALLBACK PRODUCTS ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }







// const {
//   Product,
//   OrderItem,
//   Category,
//   SubCategory,
//   ProductCategory,
//   ProductVariant,
//   VariantImage,
//   ProductPrice,
//   ProductAttribute,
//   ProductMeasurement,
//   MeasurementMaster,
//   OfferApplicableProduct,
//   Offer,
//   OfferSub,
//   StoreInventory,
//   Order
// } = require("../../models");
// const { Sequelize } = require("sequelize");
// const sequelize = require("../../config/db");
// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");




// exports.getTopSellingProducts = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const { storeId } = req.query;

//     if (!storeId) {
//       return res.status(400).json({
//         success: false,
//         message: "storeId is required for stock calculation",
//       });
//     }

//     const { limit, currentPage, offset } = getPaginationOptions(req.query);

//     /* ---------------- STEP 1: TOP SELLING PRODUCTS ---------------- */

//     const topProducts = await Product.findAll({
//       where: {
//         isActive: true,
//         soldCount: { [Sequelize.Op.gt]: 0 },
//       },
//       order: [["soldCount", "DESC"]],
//       limit,
//       offset,
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
//         "soldCount",
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
//           model: ProductVariant,
//           as: "variants",
//           attributes: [
//             "id",
//             "variantCode",
//             "unit",
//             "moq",
//             "packingType",
//             "packQuantity",
//             "dispatchType",
//             "deliverySla",
//             "isActive",
//           ],
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//             },
//             {
//               model: ProductPrice,
//               as: "price",
//               attributes: [
//                 "mrp",
//                 "sellingPrice",
//                 "discountPercentage",
//                 "currency",
//               ],
//             },
//           ],
//         },
//       ],
//     });

//     let finalProducts = [...topProducts];

//     /* ---------------- STEP 2: FALLBACK ---------------- */

//     if (topProducts.length < limit) {
//       const remaining = limit - topProducts.length;

//       const excludeIds = topProducts.map((p) => p.id);

//       const fallbackProducts = await Product.findAll({
//         where: {
//           isActive: true,
//           id: { [Sequelize.Op.notIn]: excludeIds },
//         },
//         order: [["createdAt", "DESC"]],
//         limit: remaining,
//         attributes: [
//           "id",
//           "sku",
//           "title",
//           "description",
//           "brandName",
//           "badge",
//           "gstRate",
//           "isActive",
//           "createdAt",
//           "soldCount",
//         ],
//         include: [
//           { model: Category, as: "Category", attributes: ["id", "name"] },
//           { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
//           {
//             model: ProductCategory,
//             as: "ProductCategory",
//             attributes: ["id", "name"],
//           },
//           {
//             model: ProductVariant,
//             as: "variants",
//             attributes: [
//               "id",
//               "variantCode",
//               "unit",
//               "moq",
//               "packingType",
//               "packQuantity",
//               "dispatchType",
//               "deliverySla",
//               "isActive",
//             ],
//             include: [
//               {
//                 model: VariantImage,
//                 as: "images",
//                 attributes: ["id", "imageUrl"],
//               },
//               {
//                 model: ProductPrice,
//                 as: "price",
//                 attributes: [
//                   "mrp",
//                   "sellingPrice",
//                   "discountPercentage",
//                   "currency",
//                 ],
//               },
//             ],
//           },
//         ],
//       });

//       finalProducts = [...finalProducts, ...fallbackProducts];
//     }

//     /* ---------------- STEP 3: STORE-WISE INVENTORY ---------------- */

//     const variantIds = [];

//     finalProducts.forEach((p) => {
//       p.variants?.forEach((v) => variantIds.push(v.id));
//     });

//     let inventoryMap = {};

//     if (variantIds.length > 0) {
//       const inventory = await StoreInventory.findAll({
//         where: {
//           storeId, // ✅ IMPORTANT FIX
//           variantId: { [Sequelize.Op.in]: variantIds },
//         },
//       });

//       inventory.forEach((inv) => {
//         inventoryMap[inv.variantId] = inv.stock;
//       });
//     }

//     /* ---------------- STEP 4: WISHLIST ---------------- */

//     let wishlistedMap = {};

//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId },
//         attributes: ["productId", "variantId"],
//       });

//       wishlist.forEach((w) => {
//         if (!wishlistedMap[w.productId]) {
//           wishlistedMap[w.productId] = [];
//         }
//         wishlistedMap[w.productId].push(w.variantId);
//       });
//     }

//     /* ---------------- STEP 5: FORMAT ---------------- */

//     const formattedProducts = finalProducts.map((p) => {
//       const product = p.toJSON();

//       product.variants = product.variants.map((variant) => {
//         const stock = inventoryMap[variant.id] || 0;

//         const mrp = variant.price?.mrp || 0;
//         const sellingPrice = variant.price?.sellingPrice || 0;
//         const gstRate = parseFloat(product.gstRate) || 0;

//         const gstAmount = (sellingPrice * gstRate) / 100;
//         const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);

//         const discount = mrp > 0 ? mrp - sellingPrice : 0;
//         const discountPercentage =
//           mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

//         return {
//           ...variant,
//           stock,
//           isAvailable: stock > 0,
//           price: {
//             ...(variant.price || {}),
//             mrp,
//             sellingPrice,
//             gstRate,
//             gstAmount: Math.round(gstAmount),
//             gstInclusiveAmount,
//             discount,
//             discountPercentage,
//           },
//         };
//       });

//       return {
//         ...product,
//         isWishlisted: !!wishlistedMap[product.id],
//         wishlistedVariants: wishlistedMap[product.id] || [],
//         totalSold: product.soldCount || 0,
//       };
//     });

//     /* ---------------- STEP 6: COUNT ---------------- */

//     const totalCount = await Product.count({
//       where: {
//         isActive: true,
//         soldCount: { [Sequelize.Op.gt]: 0 },
//       },
//     });

//     const response = formatPagination(
//       { count: totalCount, rows: formattedProducts },
//       currentPage,
//       limit
//     );

//     return res.json({
//       success: true,
//       source: "top-selling-products",
//       ...response,
//     });
//   } catch (error) {
//     console.error("TOP SELLING PRODUCTS ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



const {
  Product,
  Category,
  SubCategory,
  ProductCategory,
  ProductVariant,
  VariantImage,
  ProductPrice,
  ProductAttribute,
  ProductMeasurement,
  MeasurementMaster,
  StoreInventory,
  Wishlist,
} = require("../../models");

const { Sequelize } = require("sequelize");

const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.getTopSellingProducts = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { storeId } = req.query;
    const MAX_TOTAL_PRODUCTS = 30; // Maximum products across all pages
    const { limit, currentPage, offset } = getPaginationOptions(req.query);

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "storeId is required",
      });
    }

    /* ================= STEP 1: GET ALL TOP SELLING PRODUCTS ================= */
    // Get ALL top selling products (up to MAX_TOTAL_PRODUCTS)
    const allTopProducts = await Product.findAll({
      attributes: ["id", "soldCount"],
      where: {
        isActive: true,
        soldCount: { [Sequelize.Op.gt]: 0 },
      },
      order: [["soldCount", "DESC"]],
      limit: MAX_TOTAL_PRODUCTS, // Only get up to 30 top products
      raw: true,
    });

    let allProductIds = [];
    let salesMap = {};

    // Take all top products (up to MAX_TOTAL_PRODUCTS)
    const topProductsToTake = Math.min(allTopProducts.length, MAX_TOTAL_PRODUCTS);
    
    for (let i = 0; i < topProductsToTake; i++) {
      const product = allTopProducts[i];
      allProductIds.push(product.id);
      salesMap[product.id] = product.soldCount;
    }

    console.log(`Top selling products available: ${allTopProducts.length}`);
    console.log(`Top selling products selected: ${topProductsToTake}`);

    /* ================= STEP 2: FALLBACK TO FILL REMAINING SLOTS ================= */
    const remainingSlots = MAX_TOTAL_PRODUCTS - allProductIds.length;
    
    if (remainingSlots > 0) {
      console.log(`Need ${remainingSlots} fallback products to reach ${MAX_TOTAL_PRODUCTS}`);
      
      // Get fallback products (latest products, excluding already selected top products)
      const fallbackProducts = await Product.findAll({
        attributes: ["id"],
        where: {
          isActive: true,
          id: { [Sequelize.Op.notIn]: allProductIds.length > 0 ? allProductIds : [0] },
        },
        order: [["createdAt", "DESC"]], // Get latest products
        limit: remainingSlots,
        raw: true,
      });

      // Add fallback products to the list
      fallbackProducts.forEach((p) => {
        allProductIds.push(p.id);
        salesMap[p.id] = 0;
      });
      
      console.log(`Total products after fallback: ${allProductIds.length}`);
    }

    // If no products found at all
    if (allProductIds.length === 0) {
      return res.json({
        success: true,
        source: "top-selling",
        data: [],
        pagination: {
          currentPage,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        meta: {
          topSellingCount: 0,
          fallbackCount: 0,
          maxTotalProducts: MAX_TOTAL_PRODUCTS,
          totalAvailableProducts: 0,
        },
      });
    }

    /* ================= STEP 3: APPLY PAGINATION ================= */
    // Apply pagination to the 30 products
    const paginatedProductIds = allProductIds.slice(offset, offset + limit);
    const totalCount = allProductIds.length; // This will be at most 30

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    console.log(`Pagination: Page ${currentPage}, Limit ${limit}, Total ${totalCount}, Products in this page: ${paginatedProductIds.length}`);

    /* ================= STEP 4: FETCH FULL PRODUCT DETAILS FOR CURRENT PAGE ================= */
    const products = await Product.findAll({
      where: { id: paginatedProductIds },
      include: [
        { model: Category, as: "Category", attributes: ["id", "name"] },
        { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
        {
          model: ProductCategory,
          as: "ProductCategory",
          attributes: ["id", "name"],
        },

        /* -------- VARIANTS -------- */
        {
          model: ProductVariant,
          as: "variants",
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
              required: false,
              include: [
                {
                  model: MeasurementMaster,
                  as: "measurement",
                  attributes: ["name", "unit"],
                },
              ],
            },
          ],
        },

        /* -------- PRODUCT LEVEL ATTRIBUTES & MEASUREMENTS -------- */
        {
          model: ProductAttribute,
          as: "attributes",
          attributes: ["attributeKey", "attributeValue"],
          where: { variantId: null },
          required: false,
        },
        {
          model: ProductMeasurement,
          as: "measurements",
          where: { variantId: null },
          required: false,
          include: [
            {
              model: MeasurementMaster,
              as: "measurement",
              attributes: ["name", "unit"],
            },
          ],
        },
      ],
    });

    /* ================= STEP 5: GET INVENTORY FOR STORE ================= */
    const inventory = await StoreInventory.findAll({
      where: { storeId },
    });

    const inventoryMap = {};
    inventory.forEach((inv) => {
      inventoryMap[inv.variantId] = inv.stock;
    });

    /* ================= STEP 6: GET WISHLIST (IF USER LOGGED IN) ================= */
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

    /* ================= STEP 7: FORMAT PRODUCTS IN CORRECT ORDER ================= */
    const orderedProducts = paginatedProductIds.map((id) =>
      products.find((p) => p.id === id)
    ).filter(p => p);

    // Calculate global rank for each product (its position in the full 30-product list)
    const finalProducts = orderedProducts.map((p) => {
      const product = p.toJSON();
      const globalIndex = allProductIds.findIndex(id => id === product.id);
      
      /* ---- PRODUCT ATTRIBUTES ---- */
      const productAttributes = {};
      (product.attributes || []).forEach((a) => {
        productAttributes[a.attributeKey] = a.attributeValue;
      });

      /* ---- PRODUCT MEASUREMENTS ---- */
      const productMeasurements = {};
      (product.measurements || []).forEach((m) => {
        const name = m.measurement?.name;
        const unit = m.measurement?.unit || "";
        productMeasurements[name] = `${m.value} ${unit}`.trim();
      });

      /* ---- VARIANTS WITH FULL DATA ---- */
      product.variants = (product.variants || []).map((v) => {
        const stock = inventoryMap[v.id] || 0;

        /* VARIANT ATTRIBUTES */
        const variantAttributes = {};
        (v.attributes || []).forEach((a) => {
          variantAttributes[a.attributeKey] = a.attributeValue;
        });

        /* VARIANT MEASUREMENTS */
        const variantMeasurements = {};
        (v.measurements || []).forEach((m) => {
          const name = m.measurement?.name;
          const unit = m.measurement?.unit || "";
          variantMeasurements[name] = `${m.value} ${unit}`.trim();
        });

        const mrp = v.price?.mrp || 0;
        const sp = v.price?.sellingPrice || 0;
        const gstRate = parseFloat(product.gstRate) || 0;
        const gstAmount = (sp * gstRate) / 100;

        return {
          ...v,
          stock,
          totalStock: stock,
          isAvailable: stock > 0,
          stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
          attributes: variantAttributes,
          measurements: variantMeasurements,
          price: {
            ...v.price,
            gstRate,
            gstAmount: Math.round(gstAmount),
            gstInclusiveAmount: Math.round(sp + gstAmount),
            discount: mrp - sp,
            discountPercentage: mrp > 0 ? ((mrp - sp) / mrp * 100).toFixed(2) : 0,
          },
        };
      });

      return {
        ...product,
        attributes: productAttributes,
        measurements: productMeasurements,
        isWishlisted: !!wishlistedMap[product.id],
        wishlistedVariants: wishlistedMap[product.id] || [],
        totalSold: salesMap[product.id] || 0,
        isFallback: salesMap[product.id] === 0,
        globalRank: globalIndex + 1, // Global rank in the 30-product list
      };
    });

    /* ================= FINAL RESPONSE WITH DYNAMIC PAGINATION ================= */
    const response = {
      success: true,
      source: "top-selling",
      data: finalProducts,
      pagination: {
        currentPage,
        limit,
        totalCount, // Total count is at most 30
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      meta: {
        topSellingCount: topProductsToTake,
        fallbackCount: allProductIds.filter(id => salesMap[id] === 0).length,
        maxTotalProducts: MAX_TOTAL_PRODUCTS,
        totalTopSellingAvailable: allTopProducts.length,
        productsInFullList: allProductIds.length,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error("TOP SELLING PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};