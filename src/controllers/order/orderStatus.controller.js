const {
  Order,
  OrderItem,
  DeliverySlot,
  StoreInventory,
  ProductVariant,
  OrderAddress,
  Store
} = require("../../models");

// ✅ Try to import DeliveryBoy, with fallback
let DeliveryBoy;
try {
  DeliveryBoy = require("../../models/orders/deliveryBoy.model");
  console.log("✅ DeliveryBoy model loaded successfully");
} catch (err) {
  console.error("❌ Failed to load DeliveryBoy model:", err.message);
}

/**
 * Helper function to send notifications
 */
async function sendOrderStatusNotification(order, status, notes) {
  console.log(`Notification: Order ${order.orderNumber} status changed to ${status}`);
}

/**
 * Helper function to notify delivery boy
 */
async function notifyDeliveryBoy(deliveryBoy, order) {
  console.log(`Notification: Delivery boy ${deliveryBoy.name} assigned to order ${order.orderNumber}`);
}


/**
 * ADMIN: Update order status with proper flow
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findOne({
      where: { orderNumber },
      include: [{ model: Store, as: "store", attributes: ["id", "name"] }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // ❌ NO store check here anymore

    const allowedTransitions = {
      confirmed: ["picking", "cancelled"],
      picking: ["packed", "cancelled"],
      packed: ["dispatched", "cancelled"],
      dispatched: ["out_for_delivery"],
      out_for_delivery: ["delivered"],
      delivered: ["completed"],
    };

    if (
      allowedTransitions[order.status] &&
      !allowedTransitions[order.status].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${order.status} to ${status}`
      });
    }

    const updateData = { status };

    switch (status) {
      case "picking":
        updateData.pickingAt = new Date();
        break;
      case "packed":
        updateData.packedAt = new Date();
        break;
      case "dispatched":
        updateData.dispatchedAt = new Date();
        break;
      case "out_for_delivery":
        updateData.outForDeliveryAt = new Date();
        break;
      case "delivered":
        updateData.deliveredAt = new Date();
        break;
      case "completed":
        updateData.completedAt = new Date();
        updateData.paymentStatus = "paid";
        break;
      case "cancelled":
        updateData.cancelledAt = new Date();

        if (order.deliverySlotId && order.status !== "dispatched") {
          const slot = await DeliverySlot.findByPk(order.deliverySlotId);
          if (slot) {
            await slot.decrement("currentOrders");

            if (slot.currentOrders - 1 < slot.maxCapacity) {
              await slot.update({ status: "available" });
            }
          }
        }
        break;
    }

    await order.update(updateData);

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        storeName: order.store?.name,
        ...updateData
      }
    });

  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ADMIN: Assign delivery boy and mark as dispatched
 */
exports.assignDeliveryBoy = async (req, res) => {
  try {
    const { deliveryBoyId } = req.body;
    const order = req.order; // ✅ from middleware

    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Delivery boy ID is required"
      });
    }

    const deliveryBoy = await DeliveryBoy.findByPk(deliveryBoyId);

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found"
      });
    }

    if (order.status !== "packed") {
      return res.status(400).json({
        success: false,
        message: `Cannot assign delivery boy. Order status is "${order.status}". It should be "packed" first.`
      });
    }

    await order.update({
      status: "dispatched",
      deliveryBoyId,
      dispatchedAt: new Date()
    });

    await notifyDeliveryBoy(deliveryBoy, order);

    return res.json({
      success: true,
      message: `Order dispatched to delivery boy: ${deliveryBoy.name}`,
      data: {
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          dispatchedAt: order.dispatchedAt,
          storeName: order.store?.name
        },
        deliveryBoy: {
          id: deliveryBoy.id,
          name: deliveryBoy.name,
          mobile: deliveryBoy.mobile
        }
      }
    });

  } catch (err) {
    console.error("Assign delivery boy error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/**
 * DELIVERY BOY: Mark as delivered with OTP verification
 */
exports.markAsDelivered = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { otp } = req.body;
    const deliveryBoyId = req.deliveryBoy?.id;

    if (!deliveryBoyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Delivery boy not authenticated"
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required for delivery confirmation"
      });
    }

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Verify delivery boy assignment
    if (order.deliveryBoyId !== deliveryBoyId) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order"
      });
    }

    // Only out_for_delivery orders can be delivered
    if (order.status !== "out_for_delivery") {
      return res.status(400).json({
        success: false,
        message: `Cannot deliver. Order status is "${order.status}". It should be "out_for_delivery" first.`
      });
    }

    // Verify OTP
    if (order.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const updateData = {
      status: "delivered",
      otpVerified: true,
      deliveredAt: new Date()
    };

    // For COD orders, mark as completed immediately
    if (order.paymentMethod === "COD") {
      updateData.status = "completed";
      updateData.completedAt = new Date();
      updateData.paymentStatus = "paid";
    }

    await order.update(updateData);

    res.json({
      success: true,
      message: order.paymentMethod === "COD" 
        ? "Order delivered successfully. Payment collected." 
        : "Order delivered successfully.",
      data: {
        orderNumber: order.orderNumber,
        status: updateData.status,
        deliveredAt: updateData.deliveredAt || new Date()
      }
    });
  } catch (err) {
    console.error("Mark as delivered error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

/**
 * ADMIN: Cancel order (only before dispatch)
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { cancellationReason } = req.body;

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if cancellation is allowed (only before dispatched)
    const cancellableStatuses = ["pending", "confirmed", "picking", "packed"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled. Current status: ${order.status}. Cancellation only allowed before dispatch.`
      });
    }

    // Release delivery slot if assigned
    if (order.deliverySlotId) {
      const slot = await DeliverySlot.findByPk(order.deliverySlotId);
      if (slot) {
        await slot.decrement("currentOrders");
        if (slot.currentOrders - 1 < slot.maxCapacity) {
          await slot.update({ status: "available" });
        }
      }
    }

    // Restore inventory stock
    const orderItems = await OrderItem.findAll({
      where: { orderId: order.id }
    });
    
    for (const item of orderItems) {
      await StoreInventory.increment("stock", {
        by: item.quantity,
        where: { variantId: item.variantId }
      });

      // Update variant total stock
      const remainingStock = await StoreInventory.sum("stock", {
        where: { variantId: item.variantId }
      });

      await ProductVariant.update(
        {
          totalStock: remainingStock,
          stockStatus: remainingStock > 0 ? "In Stock" : "Out of Stock"
        },
        { where: { id: item.variantId } }
      );
    }

    await order.update({
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: cancellationReason || "Cancelled by admin"
    });

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason
      }
    });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

/**
 * GET: Order timeline for customer view
 */
exports.getOrderTimeline = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ 
      where: { orderNumber },
      attributes: [
        "orderNumber", "status", "createdAt", "confirmedAt", 
        "pickingAt", "packedAt", "dispatchedAt", "outForDeliveryAt",
        "deliveredAt", "completedAt", "cancelledAt"
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Map status to customer-friendly view
    const customerStatusMap = {
      pending: "Order Received",
      confirmed: "Order Confirmed",
      picking: "Preparing Your Order",
      packed: "Order Ready",
      dispatched: "Order Dispatched",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered",
      completed: "Completed",
      cancelled: "Cancelled"
    };

    const timeline = [];
    
    if (order.confirmedAt) {
      timeline.push({ 
        status: "Confirmed", 
        date: order.confirmedAt, 
        description: "Your order has been confirmed" 
      });
    }
    if (order.pickingAt) {
      timeline.push({ 
        status: "Preparing", 
        date: order.pickingAt, 
        description: "Items are being picked and packed" 
      });
    }
    if (order.packedAt) {
      timeline.push({ 
        status: "Ready", 
        date: order.packedAt, 
        description: "Order is packed and ready for dispatch" 
      });
    }
    if (order.dispatchedAt) {
      timeline.push({ 
        status: "Dispatched", 
        date: order.dispatchedAt, 
        description: "Order handed over to delivery partner" 
      });
    }
    if (order.outForDeliveryAt) {
      timeline.push({ 
        status: "Out for Delivery", 
        date: order.outForDeliveryAt, 
        description: "Delivery rider is on the way" 
      });
    }
    if (order.deliveredAt) {
      timeline.push({ 
        status: "Delivered", 
        date: order.deliveredAt, 
        description: "Order delivered successfully" 
      });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        customerFriendlyStatus: customerStatusMap[order.status],
        timeline,
        canCancel: ["pending", "confirmed", "picking", "packed"].includes(order.status)
      }
    });
  } catch (err) {
    console.error("Get order timeline error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

/**
 * DELIVERY BOY: Get my assigned orders
 */
exports.getMyAssignedOrders = async (req, res) => {
  try {
    // Get delivery boy ID from authenticated user
    const deliveryBoyId = req.deliveryBoy?.id;
    
    if (!deliveryBoyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Delivery boy not authenticated"
      });
    }

    console.log(`Fetching orders for delivery boy: ${deliveryBoyId}`);

    // Fetch orders assigned to this delivery boy
    const orders = await Order.findAll({
      where: {
        deliveryBoyId: deliveryBoyId,
        status: ["dispatched", "out_for_delivery"] // Only show active deliveries
      },
      include: [
        {
          model: OrderAddress,
          as: "address",
          attributes: [
            "fullName",
            "phoneNumber",
            "addressLine",
            "city",
            "state",
            "zipCode",
            "country",
            "latitude",
            "longitude",
            "placeId",
            "formattedAddress"
          ]
        },
        {
          model: OrderItem,
          as: "OrderItems",
          attributes: ["productName", "quantity", "totalPrice"]
        }
      ],
      order: [["deliveryDate", "ASC"], ["deliverySlotId", "ASC"]]
    });

    // Format orders with navigation links
    const formattedOrders = orders.map(order => {
      const orderJson = order.toJSON();
      const address = orderJson.address;

      if (address) {
        // Generate Google Maps navigation links
        if (address.latitude && address.longitude) {
          address.navigationLinks = {
            googleMaps: `https://www.google.com/maps?q=${address.latitude},${address.longitude}`,
            directions: `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`,
            waze: `https://waze.com/ul?ll=${address.latitude},${address.longitude}&navigate=yes`
          };
        } else if (address.formattedAddress) {
          const encodedAddress = encodeURIComponent(address.formattedAddress);
          address.navigationLinks = {
            googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
            directions: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
          };
        }
      }

      return {
        orderNumber: orderJson.orderNumber,
        status: orderJson.status,
        deliveryDate: orderJson.deliveryDate,
        deliverySlot: orderJson.deliverySlotId,
        totalAmount: orderJson.totalAmount,
        paymentMethod: orderJson.paymentMethod,
        otp: orderJson.otp, // Include OTP for delivery verification
        address: address,
        items: orderJson.OrderItems,
        timeline: {
          dispatchedAt: orderJson.dispatchedAt,
          outForDeliveryAt: orderJson.outForDeliveryAt,
          deliveredAt: orderJson.deliveredAt
        }
      };
    });

    // Get summary statistics
    const summary = {
      totalAssigned: orders.length,
      outForDelivery: orders.filter(o => o.status === "out_for_delivery").length,
      dispatched: orders.filter(o => o.status === "dispatched").length,
      todaysDeliveries: orders.filter(o => o.deliveryDate === new Date().toISOString().split('T')[0]).length
    };

    res.json({
      success: true,
      summary: summary,
      data: formattedOrders
    });
  } catch (err) {
    console.error("Get my assigned orders error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

