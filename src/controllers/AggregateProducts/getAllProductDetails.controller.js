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
// Category,
// SubCategory,
// ProductCategory,
// ProductRating,
// ProductReview,
// } = require("../../models");

// exports.getAllProductsDetails = async (req, res) => {
//   try {
//     const products = await Product.findAll({
//       attributes: [
//         "id",
//         "sku",
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



// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");

// const Offer = require("../../models/offers/offer.model");
// const OfferSub = require("../../models/offers/offerSub.model");
// const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

// const Wishlist = require("../../models/wishlist.model");

// const { Category, SubCategory, ProductCategory } = require("../../models");
// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

// exports.getAllProductsDetails = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const paginationOptions = getPaginationOptions(req.query);
//     /* ---------------- DYNAMIC WHERE ---------------- */
//     const productWhere = {};

//     if (req.query.isActive !== undefined) {
//       productWhere.isActive = req.query.isActive === "true";
//     }

//     /* ---------------- GET PRODUCTS ---------------- */
//     const products = await Product.findAndCountAll({
//       where: productWhere,
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

//         { model: ProductPrice, as: "price" },
//         { model: ProductSpec, as: "specs" },

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
//               attributes: ["id", "length", "diameter", "stock"],
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
//       distinct: true,
//       order: [["createdAt", "DESC"]],
//       ...paginationOptions,
//     });

//     /* ---------------- WISHLIST MAP ---------------- */
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

//     /* ---------------- ADD FLAGS ---------------- */
//     const finalProducts = products.rows.map((p) => {
//       const productJSON = p.toJSON();
//       if (productJSON.variants) {
//         productJSON.variants = productJSON.variants.map((variant) => {
//           if (variant.sizes) {
//             variant.sizes = variant.sizes.map((size) => ({
//               id: size.id,
//               diameter: size.diameter,
//               length: size.length,
//               stock: size.stock,

//               // 👇 what frontend needs
//               display: `M${size.diameter} × ${size.length}`,
//               value: `${size.diameter}-${size.length}`,
//             }));
//           }
//           return variant;
//         });
//       }
//       const productWishlisted = !!wishlistedMap[p.id];

//       return {
//          ...productJSON,
//         isWishlisted: productWishlisted,
//         wishlistedVariants: wishlistedMap[p.id] || [],
//       };
//     });

//     /* ---------------- FINAL PAGINATED RESPONSE ---------------- */
//     const response = formatPagination(
//       { count: products.count, rows: finalProducts }, // ✅ correct
//       paginationOptions.currentPage,
//       paginationOptions.limit,
//     );

//     return res.json({
//       success: true,
//       ...response,
//     });
//   } catch (error) {
//     console.error("GET ALL PRODUCTS ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };





const sequelize = require("../../config/db");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const VariantSize = require("../../models/productVariants/variantSize.model");

const Offer = require("../../models/offers/offer.model");
const OfferSub = require("../../models/offers/offerSub.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

const Wishlist = require("../../models/wishlist.model");

const { Category, SubCategory, ProductCategory } = require("../../models");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.getAllProductsDetails = async (req, res) => {
  try {
    const userId = req.user?.id;
    const paginationOptions = getPaginationOptions(req.query);
    
    /* ---------------- DYNAMIC WHERE ---------------- */
    const productWhere = {};

    if (req.query.isActive !== undefined) {
      productWhere.isActive = req.query.isActive === "true";
    }

    /* ---------------- GET PRODUCTS ---------------- */
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
        "updatedAt",
      ],

      include: [
        { 
          model: Category, 
          as: "Category", 
          attributes: ["id", "name"] 
        },
        { 
          model: SubCategory, 
          as: "SubCategory", 
          attributes: ["id", "name"] 
        },
        {
          model: ProductCategory,
          as: "ProductCategory",
          attributes: ["id", "name"],
        },
        { 
          model: ProductSpec, 
          as: "specs",
          attributes: ["id", "specKey", "specValue"]
        },

        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id",
            "variantCode",
            "packQuantity",
            "finish",
            "grade",
            "material",
            "threadType",
            "totalStock",
            "stockStatus",
            "isActive",
          ],
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
            },
            {
              model: VariantSize,
              as: "sizes",
              attributes: ["id", "length", "diameter", "approxWeightKg"],
            },
            {
              model: ProductPrice,
              as: "price",
              attributes: ["id", "mrp", "sellingPrice", "discountPercentage", "currency"],
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

    /* ---------------- WISHLIST MAP ---------------- */
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

    /* ---------------- ADD FLAGS ---------------- */
    const finalProducts = products.rows.map((p) => {
      const productJSON = p.toJSON();
      
      if (productJSON.variants) {
        productJSON.variants = productJSON.variants.map((variant) => {
          if (variant.sizes) {
            variant.sizes = variant.sizes.map((size) => ({
              id: size.id,
              diameter: size.diameter,
              length: size.length,
              approxWeightKg: size.approxWeightKg,
              // stock: size.stock,
              display: size.diameter && size.length 
                ? `M${size.diameter} × ${size.length}`
                : size.diameter 
                  ? `D${size.diameter}`
                  : size.length 
                    ? `L${size.length}`
                    : 'Standard',
              value: size.diameter && size.length 
                ? `${size.diameter}-${size.length}`
                : size.diameter 
                  ? `${size.diameter}`
                  : size.length 
                    ? `${size.length}`
                    : 'std',
            }));
          }
          return variant;
        });
      }

      const productWishlisted = !!wishlistedMap[productJSON.id];

      return {
        ...productJSON,
        isWishlisted: productWishlisted,
        wishlistedVariants: wishlistedMap[productJSON.id] || [],
      };
    });

    /* ---------------- FINAL PAGINATED RESPONSE ---------------- */
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
    console.error("GET ALL PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};