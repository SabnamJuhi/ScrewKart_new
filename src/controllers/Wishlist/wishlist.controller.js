const {
  Wishlist,
  Product,
  ProductPrice,
  ProductVariant,
  VariantImage,
  VariantSize,
  ProductSpec,
  Category,
  SubCategory,
  ProductCategory,
  ProductAttribute,
  ProductMeasurement,
  MeasurementMaster,
  OfferApplicableProduct,
  OfferSub,
  Offer,
  StoreInventory,
} = require("../../models");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variantId } = req.body;

    // check duplicate
    const exists = await Wishlist.findOne({
      where: { userId, productId, variantId: variantId || null },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Already in wishlist",
      });
    }

    const wishlist = await Wishlist.create({
      userId,
      productId,
      variantId: variantId || null,
    });

    res.json({
      success: true,
      message: "Added to wishlist",
      data: wishlist,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// exports.getWishlist = async (req, res) => {
//   try {
//     const userId = req.user.id;
//      const paginationOptions = getPaginationOptions(req.query);
//     const wishlistItems = await Wishlist.findAndCountAll({
//       where: { userId },

//       include: [
//         /* ---------- PRODUCT ---------- */
//         {
//           model: Product,
//           attributes: ["id", "title", "brandName", "badge", "description"],
//           include: [
//             {
//               model: ProductPrice,
//               as: "price",
//               attributes: ["mrp", "sellingPrice", "discountPercentage"],
//             },
//             {
//               model: ProductSpec,
//               as: "specs",
//               attributes: ["id", "specKey", "specValue"],
//             },
//           ],
//         },

//         /* ---------- VARIANT ---------- */
//         {
//           model: ProductVariant,
//           attributes: ["id", "colorName", "colorCode", "totalStock", "stockStatus"],
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//               required: false,
//             },
//             {
//               model: VariantSize,
//               as: "sizes",
//               attributes: ["id", "length", "stock", "diameter"],
//               required: false,
//             },
//           ],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//        distinct: true, 
//       ...paginationOptions,
//     });

//     /* ---------- FORMAT CLEAN RESPONSE ---------- */
//     const formattedWishlist = wishlistItems.rows.map((item) => {
//       const product = item.Product || {};
//       const variant = item.ProductVariant || {};
//       const price = product.price || {};

//       return {
//         wishlistId: item.id,
//         addedAt: item.createdAt,

//         /* ---------- PRODUCT ---------- */
//         product: {
//           id: product.id,
//           title: product.title,
//           brandName: product.brandName,
//           badge: product.badge,
//           description: product.description,

//           price: {
//             mrp: price.mrp || 0,
//             sellingPrice: price.sellingPrice || 0,
//             discountPercent: price.discountPercentage || 0,
//           },

//           specs:
//             product.specs?.map((s) => ({
//               specId: s.id,
//               key: s.specKey,
//               value: s.specValue,
//             })) || [],
//         },

//         /* ---------- VARIANT ---------- */
//         variant: {
//           id: variant.id,
//           colorName: variant.colorName,
//           colorCode: variant.colorCode,
//           totalStock: variant.totalStock || 0,
//           stockStatus: variant.stockStatus || "Out of Stock",

//           images:
//             variant.images?.map((img) => ({
//               id: img.id,
//               url: img.imageUrl,
//             })) || [],

//           sizes:
//             variant.sizes?.map((s) => ({
//               sizeId: s.id,
//               length: s.length,
//               stock: s.stock,
//               diameter: s.diameter,
//               inStock: s.stock > 0,
//             })) || [],
//         },
//       };
//     });
//  /* ---------- FORMAT PAGINATION ---------- */
//     const response = formatPagination(
//       {
//         count: wishlistItems.count,
//         rows: formattedWishlist,
//       },
//       paginationOptions.currentPage,
//       paginationOptions.limit
//     );

//     return res.json({
//       success: true,
//       ...response,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };



exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { storeId } = req.query; // Make it optional, not required
    const paginationOptions = getPaginationOptions(req.query);

    const wishlistItems = await Wishlist.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Product,
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
        },
      ],
      distinct: true,
      order: [["createdAt", "DESC"]],
      ...paginationOptions,
    });

    // Filter to only show wishlisted variants
    const filteredWishlistItems = wishlistItems.rows.filter(item => {
      const product = item.Product;
      if (!product || !product.variants) return false;
      
      if (item.variantId) {
        product.variants = product.variants.filter(v => v.id === item.variantId);
        return product.variants.length > 0;
      }
      return true;
    });

    /* ---------------- STORE INVENTORY (OPTIONAL) ---------------- */
    let inventoryMap = {};
    
    // Only fetch inventory if storeId is provided
    if (storeId) {
      const allVariants = filteredWishlistItems.flatMap(item => 
        item.Product?.variants || []
      );
      const variantIds = [...new Set(allVariants.map(v => v.id))];

      if (variantIds.length > 0) {
        const inventory = await StoreInventory.findAll({
          where: { storeId, variantId: variantIds },
        });

        inventory.forEach((inv) => {
          inventoryMap[inv.variantId] = inv.stock;
        });
      }
    }

    /* ---------------- FORMAT RESPONSE ---------------- */
    const finalProducts = filteredWishlistItems.map((item) => {
      const product = item.Product.toJSON();
      const wishlistedVariantId = item.variantId;

      // Format Product Level Attributes
      const productAttributes = {};
      (product.attributes || []).forEach((attr) => {
        productAttributes[attr.attributeKey] = attr.attributeValue;
      });

      // Format Product Level Measurements
      const productMeasurements = {};
      (product.measurements || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        productMeasurements[label] = `${m.value}${unit}`;
      });

      // Format variants
      product.variants = product.variants.map((variant) => {
        // Use inventory stock if storeId provided, otherwise use variant's totalStock
        const stock = storeId ? (inventoryMap[variant.id] || 0) : (variant.totalStock || 0);

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

        // Price Calculations
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

      const wishlistedVariants = wishlistedVariantId ? [wishlistedVariantId] : [];

      return {
        ...product,
        attributes: productAttributes,
        measurements: productMeasurements,
        isWishlisted: true,
        wishlistedVariants: wishlistedVariants,
        wishlistId: item.id,
        addedToWishlistAt: item.createdAt,
      };
    });

    const response = formatPagination(
      { count: finalProducts.length, rows: finalProducts },
      paginationOptions.currentPage,
      paginationOptions.limit,
    );

    return res.json({
      success: true,
      ...response,
    });
  } catch (err) {
    console.error("GET WISHLIST ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const item = await Wishlist.findOne({ where: { id, userId } });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    await item.destroy();

    res.json({
      success: true,
      message: "Removed from wishlist",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.clearWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    await Wishlist.destroy({ where: { userId } });

    res.json({
      success: true,
      message: "Wishlist cleared",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
