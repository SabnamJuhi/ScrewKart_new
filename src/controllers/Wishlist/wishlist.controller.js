const {
  Wishlist,
  Product,
  ProductPrice,
  ProductVariant,
  VariantImage,
  VariantSize,
  ProductSpec,
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

exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
     const paginationOptions = getPaginationOptions(req.query);
    const wishlistItems = await Wishlist.findAndCountAll({
      where: { userId },

      include: [
        /* ---------- PRODUCT ---------- */
        {
          model: Product,
          attributes: ["id", "title", "brandName", "badge", "description"],
          include: [
            {
              model: ProductPrice,
              as: "price",
              attributes: ["mrp", "sellingPrice", "discountPercentage"],
            },
            {
              model: ProductSpec,
              as: "specs",
              attributes: ["id", "specKey", "specValue"],
            },
          ],
        },

        /* ---------- VARIANT ---------- */
        {
          model: ProductVariant,
          attributes: ["id", "colorName", "colorCode", "totalStock", "stockStatus"],
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
              required: false,
            },
            {
              model: VariantSize,
              as: "sizes",
              attributes: ["id", "length", "stock", "diameter"],
              required: false,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
       distinct: true, 
      ...paginationOptions,
    });

    /* ---------- FORMAT CLEAN RESPONSE ---------- */
    const formattedWishlist = wishlistItems.rows.map((item) => {
      const product = item.Product || {};
      const variant = item.ProductVariant || {};
      const price = product.price || {};

      return {
        wishlistId: item.id,
        addedAt: item.createdAt,

        /* ---------- PRODUCT ---------- */
        product: {
          id: product.id,
          title: product.title,
          brandName: product.brandName,
          badge: product.badge,
          description: product.description,

          price: {
            mrp: price.mrp || 0,
            sellingPrice: price.sellingPrice || 0,
            discountPercent: price.discountPercentage || 0,
          },

          specs:
            product.specs?.map((s) => ({
              specId: s.id,
              key: s.specKey,
              value: s.specValue,
            })) || [],
        },

        /* ---------- VARIANT ---------- */
        variant: {
          id: variant.id,
          colorName: variant.colorName,
          colorCode: variant.colorCode,
          totalStock: variant.totalStock || 0,
          stockStatus: variant.stockStatus || "Out of Stock",

          images:
            variant.images?.map((img) => ({
              id: img.id,
              url: img.imageUrl,
            })) || [],

          sizes:
            variant.sizes?.map((s) => ({
              sizeId: s.id,
              length: s.length,
              stock: s.stock,
              diameter: s.diameter,
              inStock: s.stock > 0,
            })) || [],
        },
      };
    });
 /* ---------- FORMAT PAGINATION ---------- */
    const response = formatPagination(
      {
        count: wishlistItems.count,
        rows: formattedWishlist,
      },
      paginationOptions.currentPage,
      paginationOptions.limit
    );

    return res.json({
      success: true,
      ...response,
    });
  } catch (err) {
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
