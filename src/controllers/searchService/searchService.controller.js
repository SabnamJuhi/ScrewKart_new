// const { Op } = require("sequelize");

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
//           { title: { [Op.like]: `%${keyword}%` } },
//           { "$Category.name$": { [Op.like]: `%${keyword}%` } },
//           { "$SubCategory.name$": { [Op.like]: `%${keyword}%` } },
//           { "$ProductCategory.name$": { [Op.like]: `%${keyword}%` } },
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
const { sequelize } = require("../../models"); // Import sequelize instance

const Product = require("../../models/products/product.model");
const Category = require("../../models/category/category.model");
const SubCategory = require("../../models/category/subcategory.model");
const ProductCategory = require("../../models/category/productCategory.model");

const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");

const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const VariantSize = require("../../models/productVariants/variantSize.model");

const Offer = require("../../models/offers/offer.model");
const Wishlist = require("../../models/wishlist.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");
const { OfferSub } = require("../../models");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.searchProducts = async (req, res) => {
  try {
    const { keyword } = req.query;
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
          // For MySQL, use LOWER() function for case-insensitive search
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
       STEP 2: Fetch Full Product Data
    ====================================================== */

    const products = await Product.findAll({
      where: { id: productIds, isActive: true },
      include: [
        {
          model: Category,
          attributes: ["id", "name"],
        },
        {
          model: SubCategory,
          attributes: ["id", "name"],
        },
        {
          model: ProductCategory,
          attributes: ["id", "name"],
        },
        {
          model: ProductSpec,
          as: "specs",
        },
        {
          model: ProductVariant,
          as: "variants",
          where: { isActive: true },
          required: false,
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
            },
            {
              model: VariantSize,
              as: "sizes",
              attributes: ["id", "diameter", "length", "stock", "approxWeightKg"],
            },
            {
              model: ProductPrice,
              as: "price",
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
       STEP 3: Wishlist Logic
    ====================================================== */

    let wishlistData = [];
    if (userId) {
      wishlistData = await Wishlist.findAll({
        where: { userId },
        attributes: ["productId", "variantId"],
      });
    }

    const formattedProducts = products.map((product) => {
      const productJSON = product.toJSON();

      // Format sizes display
      if (productJSON.variants) {
        productJSON.variants.forEach((variant) => {
          if (variant.sizes) {
            variant.sizes = variant.sizes.map((size) => ({
              ...size,
              displaySize: `M${size.diameter} × ${size.length}`,
            }));
          }
        });
      }

      const isWishlisted = wishlistData.some(
        (item) => item.productId === product.id,
      );

      const wishlistedVariants = wishlistData
        .filter((item) => item.productId === product.id)
        .map((item) => item.variantId);

      return {
        ...productJSON,
        isWishlisted,
        wishlistedVariants,
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
      message: "Search failed",
    });
  }
};