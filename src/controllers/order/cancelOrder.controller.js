// cancelOrder.controller.js

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
const {
  createOrderNotification,
} = require("../../services/notificatonInApp.service");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Helper function to restore inventory for cancelled order
 */
async function restoreInventory(orderItems, storeId, transaction) {
  for (const item of orderItems) {
    // Restore store-specific inventory
    const storeInventory = await StoreInventory.findOne({
      where: {
        storeId: storeId,
        variantId: item.variantId,
        variantSizeId: item.sizeId || null,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (storeInventory) {
      await storeInventory.increment("stock", {
        by: item.quantity,
        transaction,
      });
    }

    // Update product variant total stock
    const totalStock = await StoreInventory.sum("stock", {
      where: { variantId: item.variantId },
      transaction,
    });

    await ProductVariant.update(
      {
        totalStock: totalStock || 0,
        stockStatus: (totalStock || 0) > 0 ? "In Stock" : "Out of Stock",
      },
      {
        where: { id: item.variantId },
        transaction,
      },
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
    lock: transaction.LOCK.UPDATE,
  });

  if (slot) {
    await slot.decrement("currentOrders", {
      by: 1,
      transaction,
    });

    const updatedSlot = await DeliverySlot.findByPk(deliverySlotId, {
      transaction,
    });

    if (updatedSlot.currentOrders < updatedSlot.maxCapacity) {
      await slot.update(
        {
          status: "available",
        },
        { transaction },
      );
    }

    return slot;
  }

  return null;
}

/**
 * Initiate refund with Razorpay
 * This will trigger your existing webhook handler
 */
async function initiateRefund(order, cancellationReason, initiatedBy = "customer") {
  if (!order.transactionId || order.paymentMethod?.toLowerCase() === "cod") {
    return { success: false, message: "No payment transaction found" };
  }

  // Check if refund already initiated
  if (order.refundId) {
    return { success: false, message: "Refund already initiated" };
  }

  try {
    // Call Razorpay refund API
    const refund = await razorpay.payments.refund(order.transactionId, {
      amount: Math.round(order.totalAmount * 100),
      speed: "normal",
      notes: {
        orderNumber: order.orderNumber,
        cancellationReason: cancellationReason,
        initiatedBy: initiatedBy,
        initiatedAt: new Date().toISOString(),
      },
    });

    console.log(`✅ Refund initiated for order ${order.orderNumber}:`, {
      refundId: refund.id,
      amount: refund.amount / 100,
    });

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
    };
  } catch (error) {
    console.error(`❌ Refund failed for order ${order.orderNumber}:`, error);
    return {
      success: false,
      error: error.error?.description || error.message,
    };
  }
}

/**
 * Cancel order - Customer endpoint
 * Handles both delivery and pickup orders
 */
exports.cancelOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderNumber } = req.params;
    const { cancellationReason } = req.body;
    const userId = req.user?.id;

    // Find order with items
    const order = await Order.findOne({
      where: { orderNumber },
      include: [{ model: OrderItem }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Check authorization
    if (userId && order.userId !== userId) {
      throw new Error("You are not authorized to cancel this order");
    }

    const isCOD = order.paymentMethod?.toLowerCase() === "cod";
    const isPrepaid = !isCOD && order.transactionId;
    const isPickup = order.deliveryType === "pickup";

    // Check if order is cancellable
    let cancellableStatuses = ["pending", "confirmed", "picking", "packed"];
    
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(
        `Order cannot be cancelled. Current status: ${order.status}.`,
      );
    }

    // Pickup order specific checks
    if (isPickup && order.pickupOtpVerified) {
      throw new Error("Order has already been picked up and cannot be cancelled");
    }

    // Restore inventory (only for delivery orders)
    const shouldRestoreInventory = !isPickup;
    if (shouldRestoreInventory) {
      await restoreInventory(order.OrderItems, order.storeId, t);
    }

    // Release delivery slot (only for delivery orders)
    if (!isPickup && order.deliverySlotId) {
      await releaseDeliverySlot(order.deliverySlotId, t);
    }

    // Update order status
    order.status = "cancelled";
    order.paymentStatus = isCOD ? "unpaid" : "refund_pending";
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason || "Cancelled by customer";

    await order.save({ transaction: t });
    await t.commit();

    // Send notification
    await createOrderNotification({
      userId: order.userId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });

    // Initiate refund for prepaid orders (outside transaction)
    let refundResult = null;
    if (isPrepaid && order.transactionId) {
      refundResult = await initiateRefund(
        order,
        cancellationReason || "Order cancelled by customer",
        "customer"
      );

      if (refundResult.success) {
        // Update order with refund ID (your webhook will handle final status)
        await Order.update(
          {
            refundId: refundResult.refundId,
            refundAmount: refundResult.amount,
          },
          { where: { id: order.id } }
        );
      } else {
        console.error(`Refund initiation failed for order ${orderNumber}:`, refundResult.error);
      }
    }

    // Prepare response
    let message = "";
    if (isPickup) {
      message = "Pickup order cancelled successfully.";
    } else {
      message = "Order cancelled successfully. Stock has been restored.";
    }

    if (isPrepaid) {
      message += " Refund has been initiated and will reflect in 3-5 business days.";
    }

    res.json({
      success: true,
      message: message,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        deliveryType: order.deliveryType,
        refundStatus: isPrepaid ? (refundResult?.success ? "initiated" : "failed") : null,
        refundId: refundResult?.refundId || null,
        inventoryRestored: shouldRestoreInventory,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("Cancel order error:", err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * Cancel pickup order - Special handling for pickup orders
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
      throw new Error(
        `Pickup order cannot be cancelled. Current status: ${order.status}`,
      );
    }

    const isCOD = order.paymentMethod?.toLowerCase() === "cod";
    const isPrepaid = !isCOD && order.transactionId;

    // IMPORTANT: For pickup orders, stock is NOT deducted until pickup
    // So we don't restore inventory - just update order status

    // Update order status
    order.status = "cancelled";
    order.paymentStatus = isCOD ? "unpaid" : "refund_pending";
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason || "Pickup order cancelled by customer";

    await order.save({ transaction: t });
    await t.commit();

    // Send notification
    await createOrderNotification({
      userId: order.userId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });

    // Initiate refund for prepaid orders
    let refundResult = null;
    if (isPrepaid && order.transactionId) {
      refundResult = await initiateRefund(
        order,
        cancellationReason || "Pickup order cancelled",
        "customer"
      );

      if (refundResult.success) {
        await Order.update(
          {
            refundId: refundResult.refundId,
            refundAmount: refundResult.amount,
          },
          { where: { id: order.id } }
        );
      }
    }

    res.json({
      success: true,
      message: isPrepaid 
        ? "Pickup order cancelled successfully. Refund will be processed."
        : "Pickup order cancelled successfully.",
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        deliveryType: "pickup",
        refundStatus: isPrepaid ? (refundResult?.success ? "initiated" : "pending") : null,
        refundId: refundResult?.refundId || null,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("Cancel pickup order error:", err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * Admin cancel order - Can cancel orders at any stage
 */
exports.adminCancelOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderNumber } = req.params;
    const { cancellationReason, refundImmediately = true } = req.body;
    const admin = req.admin;

    // Find order with items
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

    const isCOD = order.paymentMethod?.toLowerCase() === "cod";
    const isPrepaid = !isCOD && order.transactionId;
    const isPickup = order.deliveryType === "pickup";

    // Admin can cancel even if order is in later stages
    const adminCancellableStatuses = [
      "pending",
      "confirmed",
      "picking",
      "packed",
      "dispatched",
      "out_for_delivery",
    ];

    if (!adminCancellableStatuses.includes(order.status)) {
      throw new Error(
        `Order cannot be cancelled. Current status: ${order.status}.`,
      );
    }

    // For pickup orders that are already picked up, warn but allow
    if (isPickup && order.pickupOtpVerified) {
      console.warn(`Admin cancelling already picked up pickup order: ${orderNumber}`);
    }

    // Restore inventory (only for delivery orders or pickup orders not picked up)
    const shouldRestoreInventory = !isPickup || (isPickup && !order.pickupOtpVerified);
    
    if (shouldRestoreInventory) {
      await restoreInventory(order.OrderItems, order.storeId, t);
    }

    // Release delivery slot (only for delivery orders)
    if (!isPickup && order.deliverySlotId) {
      await releaseDeliverySlot(order.deliverySlotId, t);
    }

    // Update order status
    order.status = "cancelled";
    order.paymentStatus = isCOD
      ? "unpaid"
      : refundImmediately
        ? "refunded"
        : "refund_pending";
    order.cancelledAt = new Date();
    order.cancellationReason =
      cancellationReason || `Cancelled by admin (${admin.email})`;

    await order.save({ transaction: t });
    await t.commit();

    // Send notification
    await createOrderNotification({
      userId: order.userId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: `Your order has been cancelled by admin. Reason: ${order.cancellationReason}`,
    });

    // Initiate refund for prepaid orders if requested
    let refundResult = null;
    if (isPrepaid && refundImmediately && order.transactionId) {
      refundResult = await initiateRefund(
        order,
        cancellationReason || "Order cancelled by admin",
        `admin_${admin.email}`
      );

      if (refundResult.success) {
        await Order.update(
          {
            refundId: refundResult.refundId,
            refundAmount: refundResult.amount,
            paymentStatus: "refunded",
          },
          { where: { id: order.id } }
        );
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
        deliveryType: order.deliveryType,
        refundStatus: isPrepaid
          ? refundResult?.success
            ? "initiated"
            : "pending_manual"
          : "not_applicable",
        refundId: refundResult?.refundId || null,
        inventoryRestored: shouldRestoreInventory,
        slotReleased: !isPickup && !!order.deliverySlotId,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("Admin cancel order error:", err);

    res.status(400).json({
      success: false,
      message: err.message,
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

    if (
      !orderNumbers ||
      !Array.isArray(orderNumbers) ||
      orderNumbers.length === 0
    ) {
      throw new Error("Please provide an array of order numbers to cancel");
    }

    const results = {
      success: [],
      failed: [],
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
        const cancellableStatuses = [
          "pending",
          "confirmed",
          "picking",
          "packed",
          "dispatched",
        ];
        if (!cancellableStatuses.includes(order.status)) {
          results.failed.push({
            orderNumber,
            reason: `Cannot cancel order with status: ${order.status}`,
          });
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
        order.paymentStatus =
          order.paymentMethod?.toLowerCase() === "cod"
            ? "unpaid"
            : "refund_pending";
        order.cancelledAt = new Date();
        order.cancellationReason =
          cancellationReason || `Bulk cancelled by admin (${admin.email})`;

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
      data: results,
    });
  } catch (err) {
    await t.rollback();
    console.error("Bulk cancel orders error:", err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
