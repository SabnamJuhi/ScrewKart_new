// const {
//   Order,
//   OrderItem,
//   VariantSize,
//   ProductVariant,
//   sequelize,
// } = require("../../models");

// const Razorpay = require("razorpay");

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// exports.cancelOrder = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { orderNumber } = req.params;

//     const order = await Order.findOne({
//       where: { orderNumber },
//       include: [{ model: OrderItem }],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!order) throw new Error("Order not found");

//     if (["shipped", "out_for_delivery", "delivered"].includes(order.status)) {
//       throw new Error("Order cannot be cancelled now");
//     }

//     const isCOD = order.paymentMethod?.toLowerCase() === "cod";

//     // -----------------------------
//     // Update cancel state
//     // -----------------------------
//     order.status = "cancelled";
//     order.paymentStatus = isCOD ? "unpaid" : "refund_pending";
//     order.cancelledAt = new Date();

//     await order.save({ transaction: t });

//     // -----------------------------
//     // COD → restore stock immediately
//     // -----------------------------
//     if (isCOD) {
//       for (const item of order.OrderItems) {
//         await VariantSize.increment("stock", {
//           by: item.quantity,
//           where: { id: item.sizeId },
//           transaction: t,
//         });

//         await ProductVariant.increment("totalStock", {
//           by: item.quantity,
//           where: { id: item.variantId },
//           transaction: t,
//         });
//       }
//     }

//     await t.commit();

//     // -----------------------------
//     // ONLINE → call Razorpay refund
//     // -----------------------------
//     if (!isCOD && order.transactionId) {
//       await razorpay.payments.refund(order.transactionId, {
//         amount: Math.round(order.totalAmount * 100), // paisa
//         notes: { orderNumber: order.orderNumber },
//       });
//     }

//     res.json({
//       success: true,
//       message: isCOD
//         ? "COD order cancelled and stock restored"
//         : "Order cancelled. Refund initiated.",
//     });
//   } catch (err) {
//     await t.rollback();

//     res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };








// const {
//   Order,
//   OrderItem,
//   VariantSize,
//   ProductVariant,
//   StoreInventory,
//   DeliverySlot,
//   sequelize,
// } = require("../../models");

// const Razorpay = require("razorpay");

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// /**
//  * Cancel order - Supports both COD and Prepaid orders
//  * - Restores store inventory
//  * - Releases delivery slot
//  * - Initiates refund for prepaid orders
//  * - Updates order status with cancellation reason
//  */
// exports.cancelOrder = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { orderNumber } = req.params;
//     const { cancellationReason } = req.body;
//     const userId = req.user?.id;
//     const admin = req.admin; // For admin cancellation

//     // Find order with all necessary associations
//     const order = await Order.findOne({
//       where: { orderNumber },
//       include: [
//         { 
//           model: OrderItem,
//           required: true
//         },
//         {
//           model: DeliverySlot,
//           as: "slot",
//           required: false
//         }
//       ],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!order) {
//       throw new Error("Order not found");
//     }

//     // Check if user has permission to cancel
//     if (userId && order.userId !== userId) {
//       throw new Error("You are not authorized to cancel this order");
//     }

//     // Define cancellable statuses (before dispatch)
//     const cancellableStatuses = ["pending", "confirmed", "picking", "packed"];
    
//     if (!cancellableStatuses.includes(order.status)) {
//       throw new Error(`Order cannot be cancelled. Current status: ${order.status}. Cancellation only allowed before dispatch.`);
//     }

//     const isCOD = order.paymentMethod?.toLowerCase() === "cod";
//     const isPrepaid = !isCOD && order.transactionId;

//     // -----------------------------
//     // Update order status
//     // -----------------------------
//     order.status = "cancelled";
//     order.paymentStatus = isCOD ? "unpaid" : "refund_pending";
//     order.cancelledAt = new Date();
//     order.cancellationReason = cancellationReason || (admin ? "Cancelled by admin" : "Cancelled by customer");

//     await order.save({ transaction: t });

//     // -----------------------------
//     // Restore inventory stock (store-wise)
//     // -----------------------------
//     for (const item of order.OrderItems) {
//       // Restore variant size stock
//       if (item.sizeId) {
//         await VariantSize.increment("stock", {
//           by: item.quantity,
//           where: { id: item.sizeId },
//           transaction: t,
//         });
//       }

//       // Restore store inventory (store-wise stock)
//       const storeInventory = await StoreInventory.findOne({
//         where: {
//           storeId: order.storeId,
//           variantId: item.variantId
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE
//       });

//       if (storeInventory) {
//         await storeInventory.increment("stock", {
//           by: item.quantity,
//           transaction: t
//         });
//       }

//       // Update product variant total stock
//       // Calculate total stock across all stores
//       const totalStock = await StoreInventory.sum("stock", {
//         where: { variantId: item.variantId },
//         transaction: t
//       });

//       await ProductVariant.update(
//         {
//           totalStock: totalStock || 0,
//           stockStatus: (totalStock || 0) > 0 ? "In Stock" : "Out of Stock"
//         },
//         {
//           where: { id: item.variantId },
//           transaction: t
//         }
//       );
//     }

//     // -----------------------------
//     // Release delivery slot if assigned
//     // -----------------------------
//     if (order.deliverySlotId) {
//       const slot = await DeliverySlot.findByPk(order.deliverySlotId, {
//         transaction: t,
//         lock: t.LOCK.UPDATE
//       });
      
//       if (slot) {
//         // Decrement current orders in the slot
//         await slot.decrement("currentOrders", {
//           by: 1,
//           transaction: t
//         });
        
//         // If slot is no longer full, mark as available
//         if (slot.currentOrders - 1 < slot.maxCapacity) {
//           await slot.update({ status: "available" }, { transaction: t });
//         }
//       }
//     }

//     await t.commit();

//     // -----------------------------
//     // Handle refund for prepaid orders (outside transaction)
//     // -----------------------------
//     let refundResult = null;
//     if (isPrepaid && order.transactionId) {
//       try {
//         refundResult = await razorpay.payments.refund(order.transactionId, {
//           amount: Math.round(order.totalAmount * 100), // Convert to paise
//           speed: "normal",
//           notes: {
//             orderNumber: order.orderNumber,
//             reason: cancellationReason || "Order cancelled by user",
//             customerEmail: req.user?.email || "N/A"
//           }
//         });
        
//         // Update refund details in database (optional, outside transaction)
//         await Order.update(
//           {
//             refundedAt: new Date(),
//             refundId: refundResult.id,
//             paymentStatus: "refunded"
//           },
//           { where: { id: order.id } }
//         );
//       } catch (refundError) {
//         console.error("Refund failed:", refundError);
//         // Don't throw error, just log it - order is already cancelled
//         // Admin can manually process refund later
//       }
//     }

//     // -----------------------------
//     // Send notification (optional)
//     // -----------------------------
//     // await sendCancellationNotification(order, cancellationReason);

//     res.json({
//       success: true,
//       message: isCOD 
//         ? "Order cancelled successfully. Stock has been restored."
//         : isPrepaid
//         ? "Order cancelled successfully. Refund has been initiated and will reflect in 3-5 business days."
//         : "Order cancelled successfully.",
//       data: {
//         orderNumber: order.orderNumber,
//         status: order.status,
//         cancelledAt: order.cancelledAt,
//         cancellationReason: order.cancellationReason,
//         refundStatus: isPrepaid ? (refundResult ? "initiated" : "pending_manual") : null,
//         refundId: refundResult?.id || null
//       }
//     });
    
//   } catch (err) {
//     await t.rollback();
//     console.error("Cancel order error:", err);
    
//     res.status(400).json({
//       success: false,
//       message: err.message,
//       code: err.code || "CANCELLATION_FAILED"
//     });
//   }
// };

// /**
//  * Admin cancel order with additional permissions
//  */
// exports.adminCancelOrder = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { orderNumber } = req.params;
//     const { cancellationReason, refundImmediately = true } = req.body;
//     const admin = req.admin;

//     // Find order with all necessary associations
//     const order = await Order.findOne({
//       where: { orderNumber },
//       include: [{ model: OrderItem }],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!order) {
//       throw new Error("Order not found");
//     }

//     // Check store access for store admin
//     if (admin.role === "storeAdmin" && order.storeId !== admin.storeId) {
//       throw new Error("You don't have access to this order");
//     }

//     // Admin can cancel even if order is in later stages (except delivered/completed)
//     const adminCancellableStatuses = ["pending", "confirmed", "picking", "packed", "dispatched", "out_for_delivery"];
    
//     if (!adminCancellableStatuses.includes(order.status)) {
//       throw new Error(`Order cannot be cancelled. Current status: ${order.status}.`);
//     }

//     const isCOD = order.paymentMethod?.toLowerCase() === "cod";
//     const isPrepaid = !isCOD && order.transactionId;

//     // -----------------------------
//     // Update order status
//     // -----------------------------
//     order.status = "cancelled";
//     order.paymentStatus = isCOD ? "unpaid" : (refundImmediately ? "refunded" : "refund_pending");
//     order.cancelledAt = new Date();
//     order.cancellationReason = cancellationReason || `Cancelled by admin (${admin.email})`;

//     await order.save({ transaction: t });

//     // -----------------------------
//     // Restore inventory stock
//     // -----------------------------
//     for (const item of order.OrderItems) {
//       // Restore variant size stock
//       if (item.sizeId) {
//         await VariantSize.increment("stock", {
//           by: item.quantity,
//           where: { id: item.sizeId },
//           transaction: t,
//         });
//       }

//       // Restore store inventory
//       const storeInventory = await StoreInventory.findOne({
//         where: {
//           storeId: order.storeId,
//           variantId: item.variantId
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE
//       });

//       if (storeInventory) {
//         await storeInventory.increment("stock", {
//           by: item.quantity,
//           transaction: t
//         });
//       }

//       // Update product variant total stock
//       const totalStock = await StoreInventory.sum("stock", {
//         where: { variantId: item.variantId },
//         transaction: t
//       });

//       await ProductVariant.update(
//         {
//           totalStock: totalStock || 0,
//           stockStatus: (totalStock || 0) > 0 ? "In Stock" : "Out of Stock"
//         },
//         {
//           where: { id: item.variantId },
//           transaction: t
//         }
//       );
//     }

//     // -----------------------------
//     // Release delivery slot
//     // -----------------------------
//     if (order.deliverySlotId) {
//       const slot = await DeliverySlot.findByPk(order.deliverySlotId, {
//         transaction: t,
//         lock: t.LOCK.UPDATE
//       });
      
//       if (slot) {
//         await slot.decrement("currentOrders", { by: 1, transaction: t });
        
//         if (slot.currentOrders - 1 < slot.maxCapacity) {
//           await slot.update({ status: "available" }, { transaction: t });
//         }
//       }
//     }

//     await t.commit();

//     // -----------------------------
//     // Handle refund for prepaid orders
//     // -----------------------------
//     let refundResult = null;
//     if (isPrepaid && refundImmediately && order.transactionId) {
//       try {
//         refundResult = await razorpay.payments.refund(order.transactionId, {
//           amount: Math.round(order.totalAmount * 100),
//           speed: "normal",
//           notes: {
//             orderNumber: order.orderNumber,
//             reason: cancellationReason || "Order cancelled by admin",
//             adminEmail: admin.email
//           }
//         });
        
//         await Order.update(
//           {
//             refundedAt: new Date(),
//             refundId: refundResult.id,
//             paymentStatus: "refunded"
//           },
//           { where: { id: order.id } }
//         );
//       } catch (refundError) {
//         console.error("Admin refund failed:", refundError);
//       }
//     }

//     res.json({
//       success: true,
//       message: `Order cancelled successfully by ${admin.role}`,
//       data: {
//         orderNumber: order.orderNumber,
//         status: order.status,
//         cancelledAt: order.cancelledAt,
//         cancellationReason: order.cancellationReason,
//         cancelledBy: admin.email,
//         refundStatus: isPrepaid ? (refundResult ? "initiated" : "pending_manual") : "not_applicable",
//         refundId: refundResult?.id || null
//       }
//     });
    
//   } catch (err) {
//     await t.rollback();
//     console.error("Admin cancel order error:", err);
    
//     res.status(400).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// /**
//  * Cancel pickup order (special handling)
//  */
// exports.cancelPickupOrder = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { orderNumber } = req.params;
//     const { cancellationReason } = req.body;

//     const order = await Order.findOne({
//       where: { orderNumber, deliveryType: "pickup" },
//       include: [{ model: OrderItem }],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!order) {
//       throw new Error("Pickup order not found");
//     }

//     // Check if order is already picked up
//     if (order.pickupOtpVerified) {
//       throw new Error("Order has already been picked up and cannot be cancelled");
//     }

//     // Cancellable statuses for pickup orders
//     const cancellableStatuses = ["pending", "confirmed", "picking", "packed"];
    
//     if (!cancellableStatuses.includes(order.status)) {
//       throw new Error(`Pickup order cannot be cancelled. Current status: ${order.status}`);
//     }

//     // Update order status
//     order.status = "cancelled";
//     order.paymentStatus = order.paymentMethod?.toLowerCase() === "cod" ? "unpaid" : "refund_pending";
//     order.cancelledAt = new Date();
//     order.cancellationReason = cancellationReason || "Pickup order cancelled";

//     await order.save({ transaction: t });

//     // Restore inventory (same as regular cancel)
//     for (const item of order.OrderItems) {
//       if (item.sizeId) {
//         await VariantSize.increment("stock", {
//           by: item.quantity,
//           where: { id: item.sizeId },
//           transaction: t,
//         });
//       }

//       const storeInventory = await StoreInventory.findOne({
//         where: {
//           storeId: order.storeId,
//           variantId: item.variantId
//         },
//         transaction: t
//       });

//       if (storeInventory) {
//         await storeInventory.increment("stock", {
//           by: item.quantity,
//           transaction: t
//         });
//       }
//     }

//     await t.commit();

//     res.json({
//       success: true,
//       message: "Pickup order cancelled successfully",
//       data: {
//         orderNumber: order.orderNumber,
//         status: order.status,
//         cancelledAt: order.cancelledAt
//       }
//     });
    
//   } catch (err) {
//     await t.rollback();
//     console.error("Cancel pickup order error:", err);
    
//     res.status(400).json({
//       success: false,
//       message: err.message
//     });
//   }
// };






const {
  Order,
  OrderItem,
  VariantSize,
  ProductVariant,
  StoreInventory,
  DeliverySlot,
  sequelize,
} = require("../../models");

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Helper function to restore inventory for cancelled order
 */
async function restoreInventory(orderItems, storeId, transaction) {
  for (const item of orderItems) {
    // 1. Restore variant size stock (if applicable)
    if (item.sizeId) {
      await VariantSize.increment("stock", {
        by: item.quantity,
        where: { id: item.sizeId },
        transaction,
      });
    }

    // 2. Restore store-specific inventory
    const storeInventory = await StoreInventory.findOne({
      where: {
        storeId: storeId,
        variantId: item.variantId,
        variantSizeId: item.sizeId || null
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (storeInventory) {
      await storeInventory.increment("stock", {
        by: item.quantity,
        transaction
      });
    } else {
      // Create store inventory if it doesn't exist
      await StoreInventory.create({
        storeId: storeId,
        productId: item.productId,
        variantId: item.variantId,
        variantSizeId: item.sizeId || null,
        stock: item.quantity,
        reservedStock: 0,
      }, { transaction });
    }

    // 3. Update product variant total stock across all stores
    const totalStock = await StoreInventory.sum("stock", {
      where: { variantId: item.variantId },
      transaction
    });

    await ProductVariant.update(
      {
        totalStock: totalStock || 0,
        stockStatus: (totalStock || 0) > 0 ? "In Stock" : "Out of Stock"
      },
      {
        where: { id: item.variantId },
        transaction
      }
    );
  }
}

/**
 * Helper function to release delivery slot
 */
async function releaseDeliverySlot(deliverySlotId, transaction) {
  if (!deliverySlotId) return null;
  
  const slot = await DeliverySlot.findByPk(deliverySlotId, {
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  
  if (slot) {
    // Decrement current orders in the slot
    await slot.decrement("currentOrders", {
      by: 1,
      transaction
    });
    
    // Get updated current orders count
    const updatedSlot = await DeliverySlot.findByPk(deliverySlotId, {
      transaction
    });
    
    // If slot is no longer full, mark as available
    if (updatedSlot.currentOrders < updatedSlot.maxCapacity) {
      await slot.update({ 
        status: "available" 
      }, { transaction });
    }
    
    return slot;
  }
  
  return null;
}

/**
 * Cancel order - Supports both COD and Prepaid orders
 * - Restores store inventory
 * - Releases delivery slot
 * - Initiates refund for prepaid orders
 */
exports.cancelOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderNumber } = req.params;
    const { cancellationReason } = req.body;
    const userId = req.user?.id;

    // Find order with all necessary associations
    const order = await Order.findOne({
      where: { orderNumber },
      include: [
        { 
          model: OrderItem,
          required: true
        }
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Check if user has permission to cancel
    if (userId && order.userId !== userId) {
      throw new Error("You are not authorized to cancel this order");
    }

    // Define cancellable statuses (before dispatch)
    const cancellableStatuses = ["pending", "confirmed", "picking", "packed"];
    
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(`Order cannot be cancelled. Current status: ${order.status}. Cancellation only allowed before dispatch.`);
    }

    const isCOD = order.paymentMethod?.toLowerCase() === "cod";
    const isPrepaid = !isCOD && order.transactionId;

    // -----------------------------
    // Restore inventory stock (store-wise)
    // -----------------------------
    await restoreInventory(order.OrderItems, order.storeId, t);

    // -----------------------------
    // Release delivery slot if assigned
    // -----------------------------
    if (order.deliverySlotId) {
      await releaseDeliverySlot(order.deliverySlotId, t);
    }

    // -----------------------------
    // Update order status
    // -----------------------------
    order.status = "cancelled";
    order.paymentStatus = isCOD ? "unpaid" : "refund_pending";
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason || "Cancelled by customer";

    await order.save({ transaction: t });

    await t.commit();

    // -----------------------------
    // Handle refund for prepaid orders (outside transaction)
    // -----------------------------
    let refundResult = null;
    if (isPrepaid && order.transactionId) {
      try {
        refundResult = await razorpay.payments.refund(order.transactionId, {
          amount: Math.round(order.totalAmount * 100),
          speed: "normal",
          notes: {
            orderNumber: order.orderNumber,
            reason: cancellationReason || "Order cancelled by user",
            customerEmail: req.user?.email || "N/A"
          }
        });
        
        // Update refund details in database
        await Order.update(
          {
            refundedAt: new Date(),
            refundId: refundResult.id,
            paymentStatus: "refunded"
          },
          { where: { id: order.id } }
        );
      } catch (refundError) {
        console.error("Refund failed:", refundError);
      }
    }

    res.json({
      success: true,
      message: isCOD 
        ? "Order cancelled successfully. Stock has been restored."
        : isPrepaid
        ? "Order cancelled successfully. Refund has been initiated and will reflect in 3-5 business days."
        : "Order cancelled successfully.",
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        refundStatus: isPrepaid ? (refundResult ? "initiated" : "pending_manual") : null,
        refundId: refundResult?.id || null
      }
    });
    
  } catch (err) {
    await t.rollback();
    console.error("Cancel order error:", err);
    
    res.status(400).json({
      success: false,
      message: err.message,
      code: err.code || "CANCELLATION_FAILED"
    });
  }
};

/**
 * Admin cancel order with additional permissions
 */
exports.adminCancelOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderNumber } = req.params;
    const { cancellationReason, refundImmediately = true } = req.body;
    const admin = req.admin;

    // Find order with all necessary associations
    const order = await Order.findOne({
      where: { orderNumber },
      include: [{ model: OrderItem }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Check store access for store admin
    if (admin.role === "storeAdmin" && order.storeId !== admin.storeId) {
      throw new Error("You don't have access to this order");
    }

    // Admin can cancel even if order is in later stages
    const adminCancellableStatuses = ["pending", "confirmed", "picking", "packed", "dispatched", "out_for_delivery"];
    
    if (!adminCancellableStatuses.includes(order.status)) {
      throw new Error(`Order cannot be cancelled. Current status: ${order.status}.`);
    }

    const isCOD = order.paymentMethod?.toLowerCase() === "cod";
    const isPrepaid = !isCOD && order.transactionId;

    // -----------------------------
    // Restore inventory stock (store-wise)
    // -----------------------------
    await restoreInventory(order.OrderItems, order.storeId, t);

    // -----------------------------
    // Release delivery slot if assigned
    // -----------------------------
    if (order.deliverySlotId) {
      await releaseDeliverySlot(order.deliverySlotId, t);
    }

    // -----------------------------
    // Update order status
    // -----------------------------
    order.status = "cancelled";
    order.paymentStatus = isCOD ? "unpaid" : (refundImmediately ? "refunded" : "refund_pending");
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason || `Cancelled by admin (${admin.email})`;

    await order.save({ transaction: t });

    await t.commit();

    // -----------------------------
    // Handle refund for prepaid orders
    // -----------------------------
    let refundResult = null;
    if (isPrepaid && refundImmediately && order.transactionId) {
      try {
        refundResult = await razorpay.payments.refund(order.transactionId, {
          amount: Math.round(order.totalAmount * 100),
          speed: "normal",
          notes: {
            orderNumber: order.orderNumber,
            reason: cancellationReason || "Order cancelled by admin",
            adminEmail: admin.email
          }
        });
        
        await Order.update(
          {
            refundedAt: new Date(),
            refundId: refundResult.id,
            paymentStatus: "refunded"
          },
          { where: { id: order.id } }
        );
      } catch (refundError) {
        console.error("Admin refund failed:", refundError);
      }
    }

    res.json({
      success: true,
      message: `Order cancelled successfully by ${admin.role}`,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        cancelledBy: admin.email,
        refundStatus: isPrepaid ? (refundResult ? "initiated" : "pending_manual") : "not_applicable",
        refundId: refundResult?.id || null,
        inventoryRestored: true,
        slotReleased: !!order.deliverySlotId
      }
    });
    
  } catch (err) {
    await t.rollback();
    console.error("Admin cancel order error:", err);
    
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Cancel pickup order (special handling)
 */
exports.cancelPickupOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderNumber } = req.params;
    const { cancellationReason } = req.body;
    const userId = req.user?.id;

    const order = await Order.findOne({
      where: { orderNumber, deliveryType: "pickup" },
      include: [{ model: OrderItem }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw new Error("Pickup order not found");
    }

    // Check user permission
    if (userId && order.userId !== userId) {
      throw new Error("You are not authorized to cancel this order");
    }

    // Check if order is already picked up
    if (order.pickupOtpVerified) {
      throw new Error("Order has already been picked up and cannot be cancelled");
    }

    // Cancellable statuses for pickup orders
    const cancellableStatuses = ["pending", "confirmed", "picking", "packed"];
    
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(`Pickup order cannot be cancelled. Current status: ${order.status}`);
    }

    // -----------------------------
    // Restore inventory stock (store-wise)
    // -----------------------------
    await restoreInventory(order.OrderItems, order.storeId, t);

    // Note: Pickup orders don't have delivery slots, so no need to release

    // -----------------------------
    // Update order status
    // -----------------------------
    order.status = "cancelled";
    order.paymentStatus = order.paymentMethod?.toLowerCase() === "cod" ? "unpaid" : "refund_pending";
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason || "Pickup order cancelled";

    await order.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: "Pickup order cancelled successfully. Stock has been restored.",
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        inventoryRestored: true
      }
    });
    
  } catch (err) {
    await t.rollback();
    console.error("Cancel pickup order error:", err);
    
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Bulk cancel orders (Admin only)
 */
exports.bulkCancelOrders = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderNumbers, cancellationReason } = req.body;
    const admin = req.admin;

    if (!orderNumbers || !Array.isArray(orderNumbers) || orderNumbers.length === 0) {
      throw new Error("Please provide an array of order numbers to cancel");
    }

    const results = {
      success: [],
      failed: []
    };

    for (const orderNumber of orderNumbers) {
      try {
        const order = await Order.findOne({
          where: { orderNumber },
          include: [{ model: OrderItem }],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!order) {
          results.failed.push({ orderNumber, reason: "Order not found" });
          continue;
        }

        // Check store access for store admin
        if (admin.role === "storeAdmin" && order.storeId !== admin.storeId) {
          results.failed.push({ orderNumber, reason: "Store access denied" });
          continue;
        }

        // Check if cancellable
        const cancellableStatuses = ["pending", "confirmed", "picking", "packed", "dispatched"];
        if (!cancellableStatuses.includes(order.status)) {
          results.failed.push({ orderNumber, reason: `Cannot cancel order with status: ${order.status}` });
          continue;
        }

        // Restore inventory
        await restoreInventory(order.OrderItems, order.storeId, t);

        // Release delivery slot
        if (order.deliverySlotId) {
          await releaseDeliverySlot(order.deliverySlotId, t);
        }

        // Update order
        order.status = "cancelled";
        order.paymentStatus = order.paymentMethod?.toLowerCase() === "cod" ? "unpaid" : "refund_pending";
        order.cancelledAt = new Date();
        order.cancellationReason = cancellationReason || `Bulk cancelled by admin (${admin.email})`;

        await order.save({ transaction: t });

        results.success.push({ orderNumber, status: order.status });
        
      } catch (error) {
        results.failed.push({ orderNumber, reason: error.message });
      }
    }

    await t.commit();

    res.json({
      success: true,
      message: `Successfully cancelled ${results.success.length} out of ${orderNumbers.length} orders`,
      data: results
    });
    
  } catch (err) {
    await t.rollback();
    console.error("Bulk cancel orders error:", err);
    
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};