// const {
//   CartItem,
//   Product,
//   ProductPrice,
//   ProductVariant,
//   VariantImage,
//   VariantSize,
//   Store,
// } = require("../../models");
// const { StoreInventory } = require("../../models");
// const { getDeliveryCharge } = require("../../utils/deliveryCharges");
// const { getDistanceKm } = require("../../utils/distance");
// const checkCartStoreConflict = require("../../utils/checkCartStoreConflict");


// exports.getCart = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // 👉 You MUST get user location (from request / DB)
//     const { userLat, userLng } = req.query;
//      const { latitude, longitude } = req.query;
    

//     if (!latitude || !longitude) {
//       return res.status(400).json({
//         success: false,
//         message: "User location required",
//       });
//     }

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

//     if (!cartItems.length) {
//       return res.json({
//         success: true,
//         data: [],
//         summary: {
//           itemsCount: 0,
//           totalQuantity: 0,
//           subTotal: 0,
//           tax: { amount: 0 },
//           shippingFee: 0,
//           grandTotal: 0,
//           currency: "INR",
//           canCheckout: false,
//         },
//       });
//     }

//     // 🔥 GET STORE (assuming all items belong to same store)
//     const storeId = cartItems[0].storeId;

//     const store = await Store.findByPk(storeId);

//     if (!store) {
//       return res.status(400).json({
//         success: false,
//         message: "Store not found",
//       });
//     }

//     // 🔥 CALCULATE DISTANCE
//     const distanceKm = getDistanceKm(
//       Number(latitude),
//       Number(longitude),
//       Number(store.latitude),
//       Number(store.longitude)
//     );

//     // 🔥 GET ALL INVENTORY IN ONE QUERY (OPTIMIZED)
//     const inventoryList = await StoreInventory.findAll({
//       where: { storeId },
//     });

//     const inventoryMap = {};
//     inventoryList.forEach((inv) => {
//       const key = `${inv.variantId}-${inv.variantSizeId}`;
//       inventoryMap[key] = inv.stock;
//     });

//     let subTotal = 0;
//     let taxAmount = 0;
//     let totalQuantity = 0;

//     const items = [];

//     for (const item of cartItems) {
//       const sellingPrice = Number(item.variant?.price?.sellingPrice) || 0;
//       const mrp = Number(item.variant?.price?.mrp) || 0;
//       const gstRate = Number(item.product?.gstRate) || 0;

//       // 🔥 STOCK FROM MAP
//       const key = `${item.variantId}-${item.sizeId}`;
//       const currentStock = inventoryMap[key] || 0;

//       const isAvailable = currentStock > 0;
//       const status = isAvailable ? "In Stock" : "Out of Stock";

//       const validQuantity = isAvailable
//         ? Math.min(item.quantity, currentStock)
//         : 0;

//       // 🔥 GST
//       const gstAmountPerUnit = Math.round((sellingPrice * gstRate) / 100);
//       const finalPricePerUnit = Math.round(sellingPrice + gstAmountPerUnit);

//       // 🔥 TOTALS
//       const itemBaseTotal = sellingPrice * validQuantity;
//       const itemGstTotal = gstAmountPerUnit * validQuantity;
//       const itemFinalTotal = finalPricePerUnit * validQuantity;

//       if (isAvailable) {
//         subTotal += itemBaseTotal;
//         taxAmount += itemGstTotal;
//         totalQuantity += validQuantity;
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
//           diameter: item.variantSize?.diameter,
//           length: item.variantSize?.length,
//           display:
//             item.variantSize?.diameter && item.variantSize?.length
//               ? `M${item.variantSize.diameter} × ${item.variantSize.length}`
//               : "Standard",
//           stock: currentStock,
//           status,
//           isAvailable,
//         },

//         price: {
//           mrp,
//           basePrice: sellingPrice,
//           gstRate,
//           gstAmount: gstAmountPerUnit,
//           finalPrice: finalPricePerUnit,
//           discount: mrp > 0 ? mrp - sellingPrice : 0,
//           discountPercentage:
//             mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
//         },

//         quantity: validQuantity,

//         totals: {
//           baseTotal: itemBaseTotal,
//           gstTotal: itemGstTotal,
//           finalTotal: itemFinalTotal,
//         },
//       });
//     }

//     // 🔥 DELIVERY CALCULATION
//     const deliveryResult = getDeliveryCharge(distanceKm, subTotal);

//     if (!deliveryResult.isServiceable) {
//       return res.json({
//         success: true,
//         data: items,
//         summary: {
//           isServiceable: false,
//           message: "Delivery not available in your area",
//         },
//       });
//     }

//     const shippingFee = deliveryResult.deliveryCharge;
//     const grandTotal = subTotal + taxAmount + shippingFee;

//     return res.json({
//       success: true,
//       data: items,
//       summary: {
//         itemsCount: items.length,
//         totalQuantity,

//         subTotal,
//         tax: { amount: taxAmount },

//         shippingFee,
//         grandTotal,

//         currency: "INR",

//         distanceKm: Number(distanceKm.toFixed(2)),
//         deliveryMessage: deliveryResult.message,
//         isServiceable: true,

//         freeDeliveryThreshold: 999,
//         amountToFreeDelivery: subTotal >= 999 ? 0 : 999 - subTotal,

//         canCheckout:
//           items.length > 0 &&
//           items.every((i) => i.variant.isAvailable && i.quantity > 0),
//       },
//     });
//   } catch (error) {
//     console.error("GET CART ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.addToCart = async (req, res) => {
//   try {
//     const { productId, variantId, sizeId, storeId, quantity = 1 } = req.body;

//     const userId = req.user.id;

//      // 🔥 CHECK STORE CONFLICT
//     const check = await checkCartStoreConflict(userId, storeId);

//      if (!check.allowed) {
//       return res.status(400).json({
//         success: false,
//         message: check.message,
//         action: "CLEAR_CART_REQUIRED",
//       });
//     }

//     // ✅ 1. Quantity validation
//     if (quantity < 1) {
//       return res.status(400).json({
//         success: false,
//         message: "Quantity must be at least 1",
//       });
//     }

//     if (quantity > 50) {
//       return res.status(400).json({
//         success: false,
//         message: "Maximum 50 items allowed at once",
//       });
//     }

//     // ✅ 2. Validate variant
//     const validVariant = await ProductVariant.findOne({
//       where: { id: variantId, productId },
//     });

//     if (!validVariant) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid variant",
//       });
//     }

//     // ✅ 3. Validate size
//     const validSize = await VariantSize.findOne({
//       where: { id: sizeId, variantId },
//     });

//     if (!validSize) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid size",
//       });
//     }

//     // 🔥 4. CHECK STORE STOCK (REAL SOURCE OF TRUTH)
//     const inventory = await StoreInventory.findOne({
//       where: {
//         storeId,
//         productId,
//         variantId,
//         variantSizeId: sizeId,
//       },
//     });

//     if (!inventory || inventory.stock <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Out of stock",
//       });
//     }

//     // ✅ 5. Check existing cart item
//     const existingItem = await CartItem.findOne({
//       where: { userId, productId, variantId, sizeId, storeId },
//     });

//     if (existingItem) {
//       const newQuantity = existingItem.quantity + quantity;

//       // 🔥 Prevent exceeding stock
//       if (newQuantity > inventory.stock) {
//         const available = inventory.stock - existingItem.quantity;

//         return res.status(400).json({
//           success: false,
//           message:
//             available > 0
//               ? `Only ${available} more items can be added`
//               : `Already reached max stock limit (${inventory.stock})`,
//         });
//       }

//       await existingItem.increment("quantity", { by: quantity });

//       return res.json({
//         success: true,
//         message: `${quantity} item(s) added to cart`,
//         data: {
//           cartItemId: existingItem.id,
//           newQuantity,
//           stockLeft: inventory.stock - newQuantity,
//           action: "updated",
//         },
//       });
//     }

//     // 🔥 6. New item → validate against stock
//     if (quantity > inventory.stock) {
//       return res.status(400).json({
//         success: false,
//         message: `Only ${inventory.stock} items available`,
//       });
//     }

//     const newItem = await CartItem.create({
//       userId,
//       productId,
//       variantId,
//       sizeId,
//       storeId,
//       quantity,
//     });

//     return res.json({
//       success: true,
//       message: `${quantity} item(s) added to cart`,
//       data: {
//         cartItemId: newItem.id,
//         quantity: newItem.quantity,
//         stockLeft: inventory.stock - quantity,
//         action: "created",
//       },
//     });
//   } catch (error) {
//     console.error("Add to Cart Error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.mergeGuestCart = async (req, res) => {
//   const transaction = await CartItem.sequelize.transaction();

//   try {
//     const userId = req.user.id;
//     const { items } = req.body;

//     for (const g of items) {
//       const { productId, variantId, sizeId, storeId, quantity } = g;

//       // ✅ Validate variant
//       const validVariant = await ProductVariant.findOne({
//         where: { id: variantId, productId },
//       });
//       if (!validVariant) continue;

//       // ✅ Validate size
//       const validSize = await VariantSize.findOne({
//         where: { id: sizeId, variantId },
//       });
//       if (!validSize) continue;

//       // 🔥 CHECK STORE STOCK
//       const inventory = await StoreInventory.findOne({
//         where: {
//           storeId,
//           productId,
//           variantId,
//           variantSizeId: sizeId,
//         },
//       });

//       if (!inventory || inventory.stock <= 0) continue;

//       const existing = await CartItem.findOne({
//         where: { userId, productId, variantId, sizeId, storeId },
//         transaction,
//       });

//       if (existing) {
//         const newQty = existing.quantity + (quantity || 1);

//         const finalQty = Math.min(newQty, inventory.stock);

//         await existing.update(
//           { quantity: finalQty },
//           { transaction }
//         );
//       } else {
//         const finalQty = Math.min(quantity || 1, inventory.stock);

//         await CartItem.create(
//           {
//             userId,
//             productId,
//             variantId,
//             sizeId,
//             storeId,
//             quantity: finalQty,
//           },
//           { transaction }
//         );
//       }
//     }

//     await transaction.commit();

//     res.json({
//       success: true,
//       message: "Guest cart merged successfully",
//     });
//   } catch (error) {
//     await transaction.rollback();

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.decreaseQuantity = async (req, res) => {
//   try {
//     const { productId, variantId, sizeId } = req.body;
//     const userId = req.user.id;

//     const item = await CartItem.findOne({
//       where: { userId, productId, variantId, sizeId },
//     });

//     if (!item) return res.status(404).json({ message: "Item not found" });

//     if (item.quantity > 1) {
//       await item.decrement("quantity", { by: 1 });
//     } else {
//       await item.destroy();
//     }

//     res.json({ success: true, message: "Quantity decreased" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // REMOVE ITEM COMPLETELY
// exports.removeFromCart = async (req, res) => {
//   try {
//     const { cartId } = req.params;
//     const userId = req.user.id;

//     // 🔍 Find item (security check: belongs to user)
//     const cartItem = await CartItem.findOne({
//       where: {
//         id: cartId,
//         userId,
//       },
//     });

//     if (!cartItem) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart item not found",
//       });
//     }

//     // 🗑️ Delete item
//     await cartItem.destroy();

//     return res.status(200).json({
//       success: true,
//       message: "Item removed from cart",
//       data: {
//         cartId: cartId,
//       },
//     });
//   } catch (error) {
//     console.error("Remove Cart Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// //Delete cart item
// exports.deleteCartItem = async (req, res) => {
//   try {
//     const userId = req.user?.id || req.body.userId;

//     const { productId, variantId, sizeId, storeId } = req.body;

//     if (!productId || !variantId || !sizeId || !storeId) {
//       return res.status(400).json({
//         success: false,
//         message: "productId, variantId, sizeId and storeId are required",
//       });
//     }

//     const cartItem = await CartItem.findOne({
//       where: {
//         userId,
//         productId,
//         variantId,
//         sizeId,
//         storeId
//       },
//     });

//     if (!cartItem) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart item not found",
//       });
//     }

//     await cartItem.destroy();

//     return res.status(200).json({
//       success: true,
//       message: "Cart item deleted successfully",
//     });

//   } catch (error) {
//     console.error("Delete cart item error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Server error while deleting cart item",
//     });
//   }
// };


// exports.clearCart = async (req, res) => {
//   const userId = req.user.id;

//   await CartItem.destroy({ where: { userId } });

//   res.json({
//     success: true,
//     message: "Cart cleared successfully",
//   });
// };



// exports.validateLocationChange = async (req, res) => {
//   const userId = req.user.id;
//   const { newStoreId } = req.body;

//   const existingItem = await CartItem.findOne({ where: { userId } });

//   if (!existingItem) {
//     return res.json({ allowed: true });
//   }

//   if (existingItem.storeId !== newStoreId) {
//     return res.json({
//       allowed: false,
//       message:
//         "Your cart contains items from another store. Please clear cart first.",
//     });
//   }

//   return res.json({ allowed: true });
// };






const {
  CartItem,
  Product,
  ProductPrice,
  ProductVariant,
  VariantImage,
  VariantSize,
  Store,
  ProductAttribute,
  ProductMeasurement,
  MeasurementMaster,
} = require("../../models");
const { StoreInventory } = require("../../models");
const { getDeliveryCharge } = require("../../utils/deliveryCharges");
const { getDistanceKm } = require("../../utils/distance");
const checkCartStoreConflict = require("../../utils/checkCartStoreConflict");
const priceService = require("../../services/price.service");


// exports.getCart = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { latitude, longitude } = req.query;

//     if (!latitude || !longitude) {
//       return res.status(400).json({
//         success: false,
//         message: "User location required",
//       });
//     }

//     const cartItems = await CartItem.findAll({
//       where: { userId },
//       include: [
//         { model: Product, as: "product" },
//         {
//           model: ProductVariant,
//           as: "variant",
//           include: [
//             { model: VariantImage, as: "images", limit: 1 },
//             { model: ProductPrice, as: "price" },
//           ],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     if (!cartItems.length) {
//       return res.json({
//         success: true,
//         data: [],
//         summary: {
//           itemsCount: 0,
//           totalQuantity: 0,
//           subTotal: 0,
//           tax: { amount: 0 },
//           shippingFee: 0,
//           grandTotal: 0,
//           currency: "INR",
//           canCheckout: false,
//         },
//       });
//     }

//     const storeId = cartItems[0].storeId;

//     const store = await Store.findByPk(storeId);

//     const distanceKm = getDistanceKm(
//       Number(latitude),
//       Number(longitude),
//       Number(store.latitude),
//       Number(store.longitude)
//     );

//     /* 🔥 INVENTORY */
//     const inventoryList = await StoreInventory.findAll({
//       where: { storeId },
//     });

//     const inventoryMap = {};
//     inventoryList.forEach((inv) => {
//       inventoryMap[inv.variantId] = inv.stock;
//     });

//     let subTotal = 0;
//     let taxAmount = 0;
//     let totalQuantity = 0;

//     const items = [];

//     for (const item of cartItems) {
//       const currentStock = inventoryMap[item.variantId] || 0;

//       const isAvailable = currentStock > 0;
//       const validQty = isAvailable
//         ? Math.min(item.quantity, currentStock)
//         : 0;

//       /* 🔥 DYNAMIC PRICE */
//       const priceResult = await priceService.getFinalPrice(
//         item.variantId,
//         validQty || 1
//       );

//       const basePrice = Number(priceResult.price);
//       const gstRate = Number(item.product?.gstRate) || 0;

//       const gstPerUnit = Math.round((basePrice * gstRate) / 100);
//       const finalPerUnit = basePrice + gstPerUnit;

//       const baseTotal = basePrice * validQty;
//       const gstTotal = gstPerUnit * validQty;
//       const finalTotal = finalPerUnit * validQty;

//       if (isAvailable) {
//         subTotal += baseTotal;
//         taxAmount += gstTotal;
//         totalQuantity += validQty;
//       }

//       items.push({
//         cartId: item.id,
//         productId: item.productId,
//         variantId: item.variantId,
//         storeId: item.storeId,

//         title: item.product?.title,
//         image: item.variant?.images?.[0]?.imageUrl || null,

//         variant: {
//           variantCode: item.variant?.variantCode,
//           stock: currentStock,
//           status: isAvailable ? "In Stock" : "Out of Stock",
//           isAvailable,
//         },

//         pricingType: priceResult.type,

//         price: {
//           basePrice,
//           gstRate,
//           gstPerUnit,
//           finalPerUnit,
//         },

//         quantity: validQty,

//         totals: {
//           baseTotal,
//           gstTotal,
//           finalTotal,
//         },
//       });
//     }

//     const delivery = getDeliveryCharge(distanceKm, subTotal);

//     if (!delivery.isServiceable) {
//       return res.json({
//         success: true,
//         data: items,
//         summary: {
//           isServiceable: false,
//           message: "Delivery not available",
//         },
//       });
//     }

//     const shippingFee = delivery.deliveryCharge;
//     const grandTotal = subTotal + taxAmount + shippingFee;

//     return res.json({
//       success: true,
//       data: items,
//       summary: {
//         itemsCount: items.length,
//         totalQuantity,
//         subTotal,
//         tax: { amount: taxAmount },
//         shippingFee,
//         grandTotal,
//         currency: "INR",
//         distanceKm: Number(distanceKm.toFixed(2)),
//         isServiceable: true,
//         canCheckout: items.every(
//           (i) => i.variant.isAvailable && i.quantity > 0
//         ),
//       },
//     });
//   } catch (error) {
//     console.error("GET CART ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
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
          include: [
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
          model: ProductVariant,
          as: "variant",
          include: [
            { model: VariantImage, as: "images", limit: 1 },
            { model: ProductPrice, as: "price" },
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

    // Helper function to format attributes
    const formatAttributes = (arr) => {
      const obj = {};
      (arr || []).forEach((item) => { 
        obj[item.attributeKey] = item.attributeValue; 
      });
      return obj;
    };

    // Helper function to format measurements
    const formatMeasurements = (arr) => {
      const obj = {};
      (arr || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        obj[label] = `${m.value}${unit}`;
      });
      return obj;
    };

    const storeId = cartItems[0].storeId;

    const store = await Store.findByPk(storeId);

    const distanceKm = getDistanceKm(
      Number(latitude),
      Number(longitude),
      Number(store.latitude),
      Number(store.longitude)
    );

    /* 🔥 INVENTORY */
    const inventoryList = await StoreInventory.findAll({
      where: { storeId },
    });

    const inventoryMap = {};
    inventoryList.forEach((inv) => {
      inventoryMap[inv.variantId] = inv.stock;
    });

    let subTotal = 0;
    let taxAmount = 0;
    let totalQuantity = 0;

    const items = [];

    for (const item of cartItems) {
      const currentStock = inventoryMap[item.variantId] || 0;

      const isAvailable = currentStock > 0;
      const validQty = isAvailable
        ? Math.min(item.quantity, currentStock)
        : 0;

      /* 🔥 DYNAMIC PRICE */
      const priceResult = await priceService.getFinalPrice(
        item.variantId,
        validQty || 1
      );

      const basePrice = Number(priceResult.price);
      const gstRate = Number(item.product?.gstRate) || 0;

      const gstPerUnit = Math.round((basePrice * gstRate) / 100);
      const finalPerUnit = basePrice + gstPerUnit;

      const baseTotal = basePrice * validQty;
      const gstTotal = gstPerUnit * validQty;
      const finalTotal = finalPerUnit * validQty;

      if (isAvailable) {
        subTotal += baseTotal;
        taxAmount += gstTotal;
        totalQuantity += validQty;
      }

      // Format product level attributes and measurements
      const productAttributes = formatAttributes(item.product?.attributes);
      const productMeasurements = formatMeasurements(item.product?.measurements);

      // Format variant level attributes and measurements
      const variantAttributes = formatAttributes(item.variant?.attributes);
      const variantMeasurements = formatMeasurements(item.variant?.measurements);

      // Calculate price details
      const mrp = item.variant?.price?.mrp || 0;
      const sellingPrice = item.variant?.price?.sellingPrice || 0;
      const discount = mrp > 0 ? mrp - sellingPrice : 0;
      const discountPercentage = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
      const gstAmount = (sellingPrice * gstRate) / 100;

      items.push({
        cartId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        storeId: item.storeId,

        // Product basic info
        product: {
          id: item.product?.id,
          sku: item.product?.sku,
          title: item.product?.title,
          description: item.product?.description,
          brandName: item.product?.brandName,
          badge: item.product?.badge,
          gstRate: item.product?.gstRate,
          attributes: productAttributes,
          measurements: productMeasurements,
        },

        // Variant basic info
        variant: {
          id: item.variant?.id,
          variantCode: item.variant?.variantCode,
          unit: item.variant?.unit,
          moq: item.variant?.moq,
          packingType: item.variant?.packingType,
          packQuantity: item.variant?.packQuantity,
          dispatchType: item.variant?.dispatchType,
          deliverySla: item.variant?.deliverySla,
          attributes: variantAttributes,
          measurements: variantMeasurements,
          stock: currentStock,
          status: isAvailable ? "In Stock" : "Out of Stock",
          isAvailable,
        },

        // Images
        image: item.variant?.images?.[0]?.imageUrl || null,

        // Pricing
        pricingType: priceResult.type,
        
        price: {
          mrp,
          sellingPrice,
          basePrice,
          gstRate,
          gstPerUnit,
          gstAmount: Math.round(gstAmount),
          gstInclusiveAmount: Math.round(sellingPrice + gstAmount),
          finalPerUnit,
          discount,
          discountPercentage,
        },

        quantity: validQty,
        requestedQuantity: item.quantity, // Original requested quantity

        totals: {
          baseTotal,
          gstTotal,
          finalTotal,
        },
      });
    }

    const delivery = getDeliveryCharge(distanceKm, subTotal);

    if (!delivery.isServiceable) {
      return res.json({
        success: true,
        data: items,
        summary: {
          isServiceable: false,
          message: "Delivery not available",
        },
      });
    }

    const shippingFee = delivery.deliveryCharge;
    const grandTotal = subTotal + taxAmount + shippingFee;

    return res.json({
      success: true,
      data: items,
      summary: {
        itemsCount: items.length,
        totalQuantity,
        subTotal,
        tax: { 
          amount: taxAmount,
          rate: items[0]?.product?.gstRate || 0,
        },
        shippingFee,
        grandTotal,
        currency: "INR",
        distanceKm: Number(distanceKm.toFixed(2)),
        isServiceable: true,
        canCheckout: items.every(
          (i) => i.variant.isAvailable && i.quantity > 0
        ),
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
    const { productId, variantId, storeId, quantity = 1 } = req.body;

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

    // if (quantity > 50) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Maximum 50 items allowed at once",
    //   });
    // }

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

    // 🔥 4. CHECK STORE STOCK (REAL SOURCE OF TRUTH)
    const inventory = await StoreInventory.findOne({
      where: {
        storeId,
        productId,
        variantId,
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
      where: { userId, productId, variantId, storeId },
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

exports.mergeGuestCart = async (req, res) => {
  const transaction = await CartItem.sequelize.transaction();

  try {
    const userId = req.user.id;
    const { items } = req.body;

    for (const g of items) {
      const { productId, variantId, storeId, quantity } = g;

      // ✅ Validate variant
      const validVariant = await ProductVariant.findOne({
        where: { id: variantId, productId },
      });
      if (!validVariant) continue;


      // 🔥 CHECK STORE STOCK
      const inventory = await StoreInventory.findOne({
        where: {
          storeId,
          productId,
          variantId,
        },
      });

      if (!inventory || inventory.stock <= 0) continue;

      const existing = await CartItem.findOne({
        where: { userId, productId, variantId, storeId },
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
    const { productId, variantId, storeId } = req.body;
    const userId = req.user.id;

    if (!productId || !variantId || !storeId) {
      return res.status(400).json({
        success: false,
        message: "productId, variantId and storeId are required",
      });
    }

    // 🔍 Find cart item
    const item = await CartItem.findOne({
      where: { userId, productId, variantId, storeId },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    // 🔥 Get latest stock from store inventory
    const inventory = await StoreInventory.findOne({
      where: {
        storeId,
        productId,
        variantId,
      },
    });

    const currentStock = inventory?.stock || 0;

    // ❌ If already 1 → remove item
    if (item.quantity <= 1) {
      await item.destroy();

      return res.json({
        success: true,
        message: "Item removed from cart",
        data: {
          cartItemId: item.id,
          quantity: 0,
          stockLeft: currentStock,
          action: "removed",
        },
      });
    }

    // 🔽 Decrease quantity
    await item.decrement("quantity", { by: 1 });

    const updatedQty = item.quantity - 1;

    return res.json({
      success: true,
      message: "Quantity decreased",
      data: {
        cartItemId: item.id,
        quantity: updatedQty,
        stockLeft: currentStock - updatedQty,
        action: "decreased",
      },
    });
  } catch (error) {
    console.error("Decrease Cart Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
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

//Delete cart item
exports.deleteCartItem = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;

    const { productId, variantId, storeId } = req.body;

    if (!productId || !variantId || !storeId) {
      return res.status(400).json({
        success: false,
        message: "productId, variantId and storeId are required",
      });
    }

    const cartItem = await CartItem.findOne({
      where: {
        userId,
        productId,
        variantId,
        storeId
      },
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

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