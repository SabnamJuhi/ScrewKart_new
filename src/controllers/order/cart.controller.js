const {
  CartItem,
  Product,
  ProductPrice,
  ProductVariant,
  VariantImage,
  VariantSize,
  Store,
} = require("../../models");
const { StoreInventory } = require("../../models");
const { getDeliveryCharge } = require("../../utils/deliveryCharges");
const { getDistanceKm } = require("../../utils/distance");
const checkCartStoreConflict = require("../../utils/checkCartStoreConflict");

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
//     let taxAmount = 0;

//     const items = cartItems.map((item) => {
//       const sellingPrice = item.product?.price?.sellingPrice || 0;
//       const gstRate = Number(item.product?.gstRate || 0);

//       const currentStock = item.variantSize?.stock || 0;

//       // ✅ Correct stock logic
//       const isAvailable = currentStock > 0;
//       const status = isAvailable ? "In Stock" : "Out of Stock";

//       // ✅ Prevent quantity > stock
//       const validQuantity = isAvailable
//         ? Math.min(item.quantity, currentStock)
//         : 0;

//       const itemSubtotal = sellingPrice * validQuantity;
//       const itemTax = Math.round((itemSubtotal * gstRate) / 100);

//       if (isAvailable) {
//         subTotal += itemSubtotal;
//         totalQuantity += validQuantity;
//         taxAmount += itemTax;
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
//           stock: currentStock,
//           status, // ✅ dynamic
//           isAvailable,
//         },
//         sizes: item.variantSize
//           ? [
//               {
//                 id: item.variantSize.id,
//                 diameter: item.variantSize.diameter,
//                 length: item.variantSize.length,
//                 stock: item.variantSize.stock,
//                 display: `M${item.variantSize.diameter} × ${item.variantSize.length}`,
//                 value: `${item.variantSize.diameter}-${item.variantSize.length}`,
//               },
//             ]
//           : [],

//         price: sellingPrice,
//         quantity: validQuantity, // ✅ adjusted quantity
//         total: isAvailable ? itemSubtotal : 0,
//       };
//     });

//     // ✅ Shipping logic
//     const shippingFee = subTotal > 5000 || subTotal === 0 ? 0 : 150;

//     res.json({
//       success: true,
//       data: items,
//       summary: {
//         itemsCount: items.length,
//         totalQuantity,
//         subTotal,
//         tax: { amount: taxAmount },
//         grandTotal: subTotal + taxAmount + shippingFee,
//         shippingFee,
//         currency: "INR",

//         // ✅ Checkout allowed only if:
//         // - all items available
//         // - quantity > 0
//         canCheckout:
//           items.length > 0 &&
//           items.every((i) => i.variant.isAvailable && i.quantity > 0),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.addToCart = async (req, res) => {
//   try {
//     const { productId, variantId, sizeId } = req.body;
//     const userId = req.user.id;

//     // Validate variant belongs to product
//     const validVariant = await ProductVariant.findOne({
//       where: { id: variantId, productId },
//     });

//     if (!validVariant) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid variant for this product",
//       });
//     }

//     // Validate size belongs to variant
//     const validSize = await VariantSize.findOne({
//       where: { id: sizeId, variantId },
//     });

//     if (!validSize) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid size for this variant",
//       });
//     }

//     const [item, created] = await CartItem.findOrCreate({
//       where: { userId, productId, variantId, sizeId },
//       defaults: { quantity: 1 },
//     });

//     if (!created) {
//       await item.increment("quantity", { by: 1 });
//     }

//     res.json({ success: true, message: "Added to cart" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.getCart = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const cartItems = await CartItem.findAll({
//       where: { userId },
//       include: [
//         {
//           model: Product,
//           as: "product",
//         },
//         {
//           model: ProductVariant,
//           as: "variant",
//           include: [
//             { model: VariantImage, as: "images", limit: 1 },
//             { model: ProductPrice, as: "price" },
//           ],
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
//     let taxAmount = 0;

//     const items = [];

//     for (const item of cartItems) {
//       const sellingPrice = item.variant?.price?.sellingPrice || 0;
//       const gstRate = Number(item.product?.gstRate || 0);

//       // 🔥 GET STORE STOCK (REAL SOURCE)
//       const inventory = await StoreInventory.findOne({
//         where: {
//           storeId: item.storeId,
//           productId: item.productId,
//           variantId: item.variantId,
//           variantSizeId: item.sizeId,
//         },
//       });

//       const currentStock = inventory?.stock || 0;

//       const isAvailable = currentStock > 0;
//       const status = isAvailable ? "In Stock" : "Out of Stock";

//       const validQuantity = isAvailable
//         ? Math.min(item.quantity, currentStock)
//         : 0;

//       const itemSubtotal = sellingPrice * validQuantity;
//       const itemTax = Math.round((itemSubtotal * gstRate) / 100);

//       if (isAvailable) {
//         subTotal += itemSubtotal;
//         totalQuantity += validQuantity;
//         taxAmount += itemTax;
//       }

//       items.push({
//         cartId: item.id,
//         productId: item.productId,
//         variantId: item.variantId,
//         sizeId: item.sizeId,
//         storeId: item.storeId,

//         title: item.product?.title || "Unknown Product",
//         image: item.variant?.images?.[0]?.imageUrl || null,

//         variant: {
//           size: item.variantSize?.length,
//           diameter: item.variantSize?.diameter,
//           stock: currentStock,
//           status,
//           isAvailable,
//         },

//         price: sellingPrice,
//         quantity: validQuantity,
//         total: isAvailable ? itemSubtotal : 0,
//       });
//     }

//     const shippingFee = subTotal > 5000 || subTotal === 0 ? 0 : 150;

//     res.json({
//       success: true,
//       data: items,
//       summary: {
//         itemsCount: items.length,
//         totalQuantity,
//         subTotal,
//         tax: { amount: taxAmount },
//         grandTotal: subTotal + taxAmount + shippingFee,
//         shippingFee,
//         currency: "INR",
//         canCheckout:
//           items.length > 0 &&
//           items.every((i) => i.variant.isAvailable && i.quantity > 0),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    // 👉 You MUST get user location (from request / DB)
    const { userLat, userLng } = req.query;
     const { latitude, longitude } = req.query;
    

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "User location required",
      });
    }

    const cartItems = await CartItem.findAll({
      where: { userId },
      include: [
        {
          model: Product,
          as: "product",
        },
        {
          model: ProductVariant,
          as: "variant",
          include: [
            { model: VariantImage, as: "images", limit: 1 },
            { model: ProductPrice, as: "price" },
          ],
        },
        {
          model: VariantSize,
          as: "variantSize",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!cartItems.length) {
      return res.json({
        success: true,
        data: [],
        summary: {
          itemsCount: 0,
          totalQuantity: 0,
          subTotal: 0,
          tax: { amount: 0 },
          shippingFee: 0,
          grandTotal: 0,
          currency: "INR",
          canCheckout: false,
        },
      });
    }

    // 🔥 GET STORE (assuming all items belong to same store)
    const storeId = cartItems[0].storeId;

    const store = await Store.findByPk(storeId);

    if (!store) {
      return res.status(400).json({
        success: false,
        message: "Store not found",
      });
    }

    // 🔥 CALCULATE DISTANCE
    const distanceKm = getDistanceKm(
      Number(latitude),
      Number(longitude),
      Number(store.latitude),
      Number(store.longitude)
    );

    // 🔥 GET ALL INVENTORY IN ONE QUERY (OPTIMIZED)
    const inventoryList = await StoreInventory.findAll({
      where: { storeId },
    });

    const inventoryMap = {};
    inventoryList.forEach((inv) => {
      const key = `${inv.variantId}-${inv.variantSizeId}`;
      inventoryMap[key] = inv.stock;
    });

    let subTotal = 0;
    let taxAmount = 0;
    let totalQuantity = 0;

    const items = [];

    for (const item of cartItems) {
      const sellingPrice = Number(item.variant?.price?.sellingPrice) || 0;
      const mrp = Number(item.variant?.price?.mrp) || 0;
      const gstRate = Number(item.product?.gstRate) || 0;

      // 🔥 STOCK FROM MAP
      const key = `${item.variantId}-${item.sizeId}`;
      const currentStock = inventoryMap[key] || 0;

      const isAvailable = currentStock > 0;
      const status = isAvailable ? "In Stock" : "Out of Stock";

      const validQuantity = isAvailable
        ? Math.min(item.quantity, currentStock)
        : 0;

      // 🔥 GST
      const gstAmountPerUnit = Math.round((sellingPrice * gstRate) / 100);
      const finalPricePerUnit = Math.round(sellingPrice + gstAmountPerUnit);

      // 🔥 TOTALS
      const itemBaseTotal = sellingPrice * validQuantity;
      const itemGstTotal = gstAmountPerUnit * validQuantity;
      const itemFinalTotal = finalPricePerUnit * validQuantity;

      if (isAvailable) {
        subTotal += itemBaseTotal;
        taxAmount += itemGstTotal;
        totalQuantity += validQuantity;
      }

      items.push({
        cartId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        sizeId: item.sizeId,
        storeId: item.storeId,

        title: item.product?.title || "Unknown Product",
        image: item.variant?.images?.[0]?.imageUrl || null,

        variant: {
          diameter: item.variantSize?.diameter,
          length: item.variantSize?.length,
          display:
            item.variantSize?.diameter && item.variantSize?.length
              ? `M${item.variantSize.diameter} × ${item.variantSize.length}`
              : "Standard",
          stock: currentStock,
          status,
          isAvailable,
        },

        price: {
          mrp,
          basePrice: sellingPrice,
          gstRate,
          gstAmount: gstAmountPerUnit,
          finalPrice: finalPricePerUnit,
          discount: mrp > 0 ? mrp - sellingPrice : 0,
          discountPercentage:
            mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
        },

        quantity: validQuantity,

        totals: {
          baseTotal: itemBaseTotal,
          gstTotal: itemGstTotal,
          finalTotal: itemFinalTotal,
        },
      });
    }

    // 🔥 DELIVERY CALCULATION
    const deliveryResult = getDeliveryCharge(distanceKm, subTotal);

    if (!deliveryResult.isServiceable) {
      return res.json({
        success: true,
        data: items,
        summary: {
          isServiceable: false,
          message: "Delivery not available in your area",
        },
      });
    }

    const shippingFee = deliveryResult.deliveryCharge;
    const grandTotal = subTotal + taxAmount + shippingFee;

    return res.json({
      success: true,
      data: items,
      summary: {
        itemsCount: items.length,
        totalQuantity,

        subTotal,
        tax: { amount: taxAmount },

        shippingFee,
        grandTotal,

        currency: "INR",

        distanceKm: Number(distanceKm.toFixed(2)),
        deliveryMessage: deliveryResult.message,
        isServiceable: true,

        freeDeliveryThreshold: 999,
        amountToFreeDelivery: subTotal >= 999 ? 0 : 999 - subTotal,

        canCheckout:
          items.length > 0 &&
          items.every((i) => i.variant.isAvailable && i.quantity > 0),
      },
    });
  } catch (error) {
    console.error("GET CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, variantId, sizeId, storeId, quantity = 1 } = req.body;

    const userId = req.user.id;

     // 🔥 CHECK STORE CONFLICT
    const check = await checkCartStoreConflict(userId, storeId);

     if (!check.allowed) {
      return res.status(400).json({
        success: false,
        message: check.message,
        action: "CLEAR_CART_REQUIRED",
      });
    }

    // ✅ 1. Quantity validation
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    if (quantity > 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum 50 items allowed at once",
      });
    }

    // ✅ 2. Validate variant
    const validVariant = await ProductVariant.findOne({
      where: { id: variantId, productId },
    });

    if (!validVariant) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant",
      });
    }

    // ✅ 3. Validate size
    const validSize = await VariantSize.findOne({
      where: { id: sizeId, variantId },
    });

    if (!validSize) {
      return res.status(400).json({
        success: false,
        message: "Invalid size",
      });
    }

    // 🔥 4. CHECK STORE STOCK (REAL SOURCE OF TRUTH)
    const inventory = await StoreInventory.findOne({
      where: {
        storeId,
        productId,
        variantId,
        variantSizeId: sizeId,
      },
    });

    if (!inventory || inventory.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Out of stock",
      });
    }

    // ✅ 5. Check existing cart item
    const existingItem = await CartItem.findOne({
      where: { userId, productId, variantId, sizeId, storeId },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      // 🔥 Prevent exceeding stock
      if (newQuantity > inventory.stock) {
        const available = inventory.stock - existingItem.quantity;

        return res.status(400).json({
          success: false,
          message:
            available > 0
              ? `Only ${available} more items can be added`
              : `Already reached max stock limit (${inventory.stock})`,
        });
      }

      await existingItem.increment("quantity", { by: quantity });

      return res.json({
        success: true,
        message: `${quantity} item(s) added to cart`,
        data: {
          cartItemId: existingItem.id,
          newQuantity,
          stockLeft: inventory.stock - newQuantity,
          action: "updated",
        },
      });
    }

    // 🔥 6. New item → validate against stock
    if (quantity > inventory.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${inventory.stock} items available`,
      });
    }

    const newItem = await CartItem.create({
      userId,
      productId,
      variantId,
      sizeId,
      storeId,
      quantity,
    });

    return res.json({
      success: true,
      message: `${quantity} item(s) added to cart`,
      data: {
        cartItemId: newItem.id,
        quantity: newItem.quantity,
        stockLeft: inventory.stock - quantity,
        action: "created",
      },
    });
  } catch (error) {
    console.error("Add to Cart Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// exports.mergeGuestCart = async (req, res) => {
//   const transaction = await CartItem.sequelize.transaction();

//   try {
//     const userId = req.user.id;
//     const { items } = req.body;

//     for (const g of items) {
//       const { productId, variantId, sizeId, quantity } = g;

//       const validVariant = await ProductVariant.findOne({
//         where: { id: variantId, productId },
//       });
//       if (!validVariant) continue;

//       const validSize = await VariantSize.findOne({
//         where: { id: sizeId, variantId },
//       });
//       if (!validSize) continue;

//       const existing = await CartItem.findOne({
//         where: { userId, productId, variantId, sizeId },
//         transaction,
//       });

//       if (existing) {
//         await existing.increment("quantity", {
//           by: quantity || 1,
//           transaction,
//         });
//       } else {
//         await CartItem.create(
//           { userId, productId, variantId, sizeId, quantity: quantity || 1 },
//           { transaction },
//         );
//       }
//     }

//     await transaction.commit();
//     res.json({ success: true, message: "Guest cart merged" });
//   } catch (error) {
//     await transaction.rollback();
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

exports.mergeGuestCart = async (req, res) => {
  const transaction = await CartItem.sequelize.transaction();

  try {
    const userId = req.user.id;
    const { items } = req.body;

    for (const g of items) {
      const { productId, variantId, sizeId, storeId, quantity } = g;

      // ✅ Validate variant
      const validVariant = await ProductVariant.findOne({
        where: { id: variantId, productId },
      });
      if (!validVariant) continue;

      // ✅ Validate size
      const validSize = await VariantSize.findOne({
        where: { id: sizeId, variantId },
      });
      if (!validSize) continue;

      // 🔥 CHECK STORE STOCK
      const inventory = await StoreInventory.findOne({
        where: {
          storeId,
          productId,
          variantId,
          variantSizeId: sizeId,
        },
      });

      if (!inventory || inventory.stock <= 0) continue;

      const existing = await CartItem.findOne({
        where: { userId, productId, variantId, sizeId, storeId },
        transaction,
      });

      if (existing) {
        const newQty = existing.quantity + (quantity || 1);

        const finalQty = Math.min(newQty, inventory.stock);

        await existing.update(
          { quantity: finalQty },
          { transaction }
        );
      } else {
        const finalQty = Math.min(quantity || 1, inventory.stock);

        await CartItem.create(
          {
            userId,
            productId,
            variantId,
            sizeId,
            storeId,
            quantity: finalQty,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "Guest cart merged successfully",
    });
  } catch (error) {
    await transaction.rollback();

    res.status(500).json({
      success: false,
      message: error.message,
    });
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

// REMOVE ITEM COMPLETELY
exports.removeFromCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    const userId = req.user.id;

    // 🔍 Find item (security check: belongs to user)
    const cartItem = await CartItem.findOne({
      where: {
        id: cartId,
        userId,
      },
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // 🗑️ Delete item
    await cartItem.destroy();

    return res.status(200).json({
      success: true,
      message: "Item removed from cart",
      data: {
        cartId: cartId,
      },
    });
  } catch (error) {
    console.error("Remove Cart Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
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
        storeId
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


exports.clearCart = async (req, res) => {
  const userId = req.user.id;

  await CartItem.destroy({ where: { userId } });

  res.json({
    success: true,
    message: "Cart cleared successfully",
  });
};



exports.validateLocationChange = async (req, res) => {
  const userId = req.user.id;
  const { newStoreId } = req.body;

  const existingItem = await CartItem.findOne({ where: { userId } });

  if (!existingItem) {
    return res.json({ allowed: true });
  }

  if (existingItem.storeId !== newStoreId) {
    return res.json({
      allowed: false,
      message:
        "Your cart contains items from another store. Please clear cart first.",
    });
  }

  return res.json({ allowed: true });
};