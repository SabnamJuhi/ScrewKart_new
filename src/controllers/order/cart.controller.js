const {
  CartItem,
  Product,
  ProductPrice,
  ProductVariant,
  VariantImage,
  VariantSize,
} = require("../../models");

// exports.getCart = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const cartItems = await CartItem.findAll({
//       where: { userId },
//       include: [
//         {
//           model: Product,
//           as: "product",
//           include: [{ model: ProductPrice, as: "price" }],
//         },
//         {
//           model: ProductVariant,
//           as: "variant",
//           include: [{ model: VariantImage, as: "images", limit: 1 }],
//         },
//         {
//           model: VariantSize,
//           as: "variantSize",
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     let subTotal = 0;
//     let totalQuantity = 0;

//     const items = cartItems.map((item) => {
//       const sellingPrice = item.product?.price?.sellingPrice || 0;

//       const currentStock = item.variantSize?.stock || 0;

//       const isAvailable = currentStock > 0;

//       const status = currentStock > 0 ? "In Stock" : "Out of Stock";

//       const itemTotal = sellingPrice * item.quantity;

//       if (isAvailable) {
//         subTotal += itemTotal;
//         totalQuantity += item.quantity;
//       }

//       return {
//         cartId: item.id,
//         productId: item.productId,
//         variantId: item.variantId,
//         sizeId: item.sizeId,

//         title: item.product?.title || "Unknown Product",
//         image: item.variant?.images?.[0]?.imageUrl || null,

//         variant: {
//           color: item.variant?.colorName,
//           size: item.variantSize?.size,
//           stock: item.variantSize?.stock || 0,
//           status: item.variant?.stockStatus,
//           isAvailable,
//         },

//         price: sellingPrice,
//         quantity: item.quantity,
//         total: isAvailable ? itemTotal : 0,
//       };
//     });

//     // const taxAmount = Math.round(subTotal * 0.12);
//     let taxAmount = 0;

//     cartItems.forEach((item) => {
//       const sellingPrice = item.product?.price?.sellingPrice || 0;
//       const qty = item.quantity || 0;
//       const gstRate = Number(item.product?.gstRate || 0);

//       const itemSubtotal = sellingPrice * qty;
//       const itemTax = Math.round((itemSubtotal * gstRate) / 100);

//       taxAmount += itemTax;
//     });

//     const shippingFee = subTotal > 5000 || subTotal === 0 ? 0 : 150;

//     res.json({
//       success: true,
//       data: items,
//       summary: {
//         itemsCount: items.length,
//         totalQuantity,
//         subTotal,
//         // tax: { rate: "12%", amount: taxAmount },
//         tax: { amount: taxAmount }, // dynamic GST
//         grandTotal: subTotal + taxAmount + shippingFee,
//         shippingFee,
//         currency: "INR",
//         canCheckout: items.every((i) => i.variant.isAvailable),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await CartItem.findAll({
      where: { userId },
      include: [
        {
          model: Product,
          as: "product",
          include: [{ model: ProductPrice, as: "price" }],
        },
        {
          model: ProductVariant,
          as: "variant",
          include: [{ model: VariantImage, as: "images", limit: 1 }],
        },
        {
          model: VariantSize,
          as: "variantSize",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    let subTotal = 0;
    let totalQuantity = 0;
    let taxAmount = 0;

    const items = cartItems.map((item) => {
      const sellingPrice = item.product?.price?.sellingPrice || 0;
      const gstRate = Number(item.product?.gstRate || 0);

      const currentStock = item.variantSize?.stock || 0;

      // ✅ Correct stock logic
      const isAvailable = currentStock > 0;
      const status = isAvailable ? "In Stock" : "Out of Stock";

      // ✅ Prevent quantity > stock
      const validQuantity = isAvailable
        ? Math.min(item.quantity, currentStock)
        : 0;

      const itemSubtotal = sellingPrice * validQuantity;
      const itemTax = Math.round((itemSubtotal * gstRate) / 100);

      if (isAvailable) {
        subTotal += itemSubtotal;
        totalQuantity += validQuantity;
        taxAmount += itemTax;
      }

      return {
        cartId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        sizeId: item.sizeId,

        title: item.product?.title || "Unknown Product",
        image: item.variant?.images?.[0]?.imageUrl || null,

        variant: {
          color: item.variant?.colorName,
          size: item.variantSize?.size,
          stock: currentStock,
          status, // ✅ dynamic
          isAvailable,
        },
        sizes: item.variantSize
          ? [
              {
                id: item.variantSize.id,
                diameter: item.variantSize.diameter,
                length: item.variantSize.length,
                stock: item.variantSize.stock,
                display: `M${item.variantSize.diameter} × ${item.variantSize.length}`,
                value: `${item.variantSize.diameter}-${item.variantSize.length}`,
              },
            ]
          : [],

        price: sellingPrice,
        quantity: validQuantity, // ✅ adjusted quantity
        total: isAvailable ? itemSubtotal : 0,
      };
    });

    // ✅ Shipping logic
    const shippingFee = subTotal > 5000 || subTotal === 0 ? 0 : 150;

    res.json({
      success: true,
      data: items,
      summary: {
        itemsCount: items.length,
        totalQuantity,
        subTotal,
        tax: { amount: taxAmount },
        grandTotal: subTotal + taxAmount + shippingFee,
        shippingFee,
        currency: "INR",

        // ✅ Checkout allowed only if:
        // - all items available
        // - quantity > 0
        canCheckout:
          items.length > 0 &&
          items.every((i) => i.variant.isAvailable && i.quantity > 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, variantId, sizeId } = req.body;
    const userId = req.user.id;

    // Validate variant belongs to product
    const validVariant = await ProductVariant.findOne({
      where: { id: variantId, productId },
    });

    if (!validVariant) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant for this product",
      });
    }

    // Validate size belongs to variant
    const validSize = await VariantSize.findOne({
      where: { id: sizeId, variantId },
    });

    if (!validSize) {
      return res.status(400).json({
        success: false,
        message: "Invalid size for this variant",
      });
    }

    const [item, created] = await CartItem.findOrCreate({
      where: { userId, productId, variantId, sizeId },
      defaults: { quantity: 1 },
    });

    if (!created) {
      await item.increment("quantity", { by: 1 });
    }

    res.json({ success: true, message: "Added to cart" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.mergeGuestCart = async (req, res) => {
  const transaction = await CartItem.sequelize.transaction();

  try {
    const userId = req.user.id;
    const { items } = req.body;

    for (const g of items) {
      const { productId, variantId, sizeId, quantity } = g;

      const validVariant = await ProductVariant.findOne({
        where: { id: variantId, productId },
      });
      if (!validVariant) continue;

      const validSize = await VariantSize.findOne({
        where: { id: sizeId, variantId },
      });
      if (!validSize) continue;

      const existing = await CartItem.findOne({
        where: { userId, productId, variantId, sizeId },
        transaction,
      });

      if (existing) {
        await existing.increment("quantity", {
          by: quantity || 1,
          transaction,
        });
      } else {
        await CartItem.create(
          { userId, productId, variantId, sizeId, quantity: quantity || 1 },
          { transaction },
        );
      }
    }

    await transaction.commit();
    res.json({ success: true, message: "Guest cart merged" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.decreaseQuantity = async (req, res) => {
  try {
    const { productId, variantId, sizeId } = req.body;
    const userId = req.user.id;

    const item = await CartItem.findOne({
      where: { userId, productId, variantId, sizeId },
    });

    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.quantity > 1) {
      await item.decrement("quantity", { by: 1 });
    } else {
      await item.destroy();
    }

    res.json({ success: true, message: "Quantity decreased" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. REMOVE ITEM COMPLETELY
 */
exports.removeFromCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    await CartItem.destroy({ where: { id: cartId, userId: req.user.id } });
    res.json({ success: true, message: "Item removed from cart" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/cart/item
exports.deleteCartItem = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;

    const { productId, variantId, sizeId } = req.body;

    if (!productId || !variantId || !sizeId) {
      return res.status(400).json({
        success: false,
        message: "productId, variantId and sizeId are required",
      });
    }

    // Find exact cart row
    const cartItem = await CartItem.findOne({
      where: {
        userId,
        productId,
        variantId,
        sizeId,
      },
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // Delete whole row (even if quantity = 29 or 14 etc.)
    await cartItem.destroy();

    return res.status(200).json({
      success: true,
      message: "Cart item deleted successfully",
    });
  } catch (error) {
    console.error("Delete cart item error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting cart item",
    });
  }
};
