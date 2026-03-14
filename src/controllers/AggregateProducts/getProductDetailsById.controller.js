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

const {
  Category,
  SubCategory,
  ProductCategory,
  ProductRating,
  ProductReview,
} = require("../../models");

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
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
        // CATEGORY HIERARCHY
        {
          model: Category,
          as: "Category",
          attributes: ["id", "name"],
        },
        {
          model: SubCategory,
          as: "SubCategory",
          attributes: ["id", "name"],
        },
        {
          model: ProductCategory,
          as: "ProductCategory",
          attributes: ["id", "name"],
        },

        // SPECS
        {
          model: ProductSpec,
          as: "specs",
          attributes: ["id", "specKey", "specValue"],
        },

        // RATINGS
        {
          model: ProductRating,
          as: "rating",
        },

        // REVIEWS
        {
          model: ProductReview,
          as: "reviews",
        },

        // VARIANTS
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
            // VARIANT PRICE
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

            // IMAGES
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
            },

            // SIZES
            {
              model: VariantSize,
              as: "sizes",
              attributes: [
                "id",
                "length",
                "diameter",
                "approxWeightKg",
                "stock",
              ],
            },
          ],
        },

        // OFFERS
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
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productData = product.toJSON();

    // FORMAT SIZES FOR FRONTEND
    productData.variants = productData.variants.map((variant) => {
      variant.sizes = variant.sizes.map((size) => ({
        id: size.id,
        diameter: size.diameter,
        length: size.length,
        approxWeightKg: size.approxWeightKg,
        stock: size.stock,

        display: `M${size.diameter} × ${size.length}`,
        value: `${size.diameter}-${size.length}`,
      }));

      return variant;
    });

    return res.json({
      success: true,
      data: productData,
    });
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};