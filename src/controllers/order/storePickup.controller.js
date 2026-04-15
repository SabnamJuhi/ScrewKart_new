const { Order, Store } = require("../../models");
const DeliveryBoy =  require("../../models/orders/deliveryBoy.model")

/**
 * Generate OTP (for reference)
 */
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * STORE ADMIN: Verify delivery boy OTP (when delivery boy picks up items)
 */
exports.verifyDeliveryBoyPickup = async (req, res) => {
  try {
    const { orderNumber, otp } = req.body;

    if (!orderNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Order number and OTP are required"
      });
    }

    // ✅ SINGLE FULL FETCH (needed for business logic)
    const order = await Order.findOne({
      where: { orderNumber },
      include: [
        { model: Store, as: "store", attributes: ["id", "name"] }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // ❌ NO NEED store check (already done in middleware)

    // ================= BUSINESS LOGIC =================

    if (order.deliveryType !== "delivery") {
      return res.status(400).json({
        success: false,
        message: "This is a pickup order"
      });
    }

    if (order.deliveryPickupOtpVerified) {
      return res.status(400).json({
        success: false,
        message: "Items already handed over"
      });
    }

    if (order.deliveryPickupOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    await order.update({
      deliveryPickupOtpVerified: true,
      storeHandoverAt: new Date(),
      pickedUpBy: "delivery_boy",
      status: "out_for_delivery",
      outForDeliveryAt: new Date()
    });

    return res.json({
      success: true,
      message: "Items handed over to delivery boy successfully",
      data: {
        orderNumber: order.orderNumber,
        storeName: order.store?.name,
        handoverTime: order.storeHandoverAt,
        nextStep: "Delivery boy can now deliver to customer"
      }
    });

  } catch (err) {
    console.error("Verify delivery boy pickup error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/**
 * STORE ADMIN: Verify customer OTP (when customer picks up items)
 */
exports.verifyCustomerPickup = async (req, res) => {
  try {
    const { orderNumber, otp } = req.body;

    if (!orderNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Order number and OTP are required"
      });
    }

    const order = await Order.findOne({
      where: { orderNumber },
      include: [
        { model: Store, as: "store", attributes: ["id", "name"] }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // ❌ Store check already handled by middleware

    if (order.deliveryType !== "pickup") {
      return res.status(400).json({
        success: false,
        message: "This is a delivery order"
      });
    }

    if (order.pickupOtpVerified) {
      return res.status(400).json({
        success: false,
        message: "Items already handed over"
      });
    }

    if (order.pickupOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    await order.update({
      pickupOtpVerified: true,
      storeHandoverAt: new Date(),
      pickedUpBy: "customer",
      status: "completed",
      completedAt: new Date(),
      paymentStatus: "paid"
    });

    return res.json({
      success: true,
      message: "Order picked up by customer successfully",
      data: {
        orderNumber: order.orderNumber,
        storeName: order.store?.name,
        pickupTime: order.storeHandoverAt
      }
    });

  } catch (err) {
    console.error("Verify customer pickup error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/**
 * STORE ADMIN: Get all pending pickups for their store
 */
const { Op } = require("sequelize");

exports.getPendingPickups = async (req, res) => {
  try {
    const adminStoreId = req.admin?.storeId;
    const isSuperAdmin = req.admin?.role === "superAdmin";

    // ✅ Store condition
    const storeCondition = isSuperAdmin
      ? {}
      : { storeId: adminStoreId };

    // ================= DELIVERY BOY PICKUPS =================
    const pendingDeliveryPickups = await Order.findAll({
      where: {
        ...storeCondition,
        deliveryType: "delivery",
        deliveryPickupOtpVerified: false,
        status: {
          [Op.in]: ["confirmed", "packed"]
        }
      },
      include: [
        {
          model: DeliveryBoy,
          as: "deliveryBoy",
          attributes: ["id", "name", "mobile"]
        },
        {
          model: Store,
          as: "store",
          attributes: ["id", "name"]
        }
      ],
      attributes: [
        "orderNumber",
        "deliveryPickupOtp",
        "deliveryDate",
        "deliverySlotId",
        "totalAmount"
      ],
      order: [
        ["deliveryDate", "ASC"],
        ["deliverySlotId", "ASC"]
      ]
    });

    // ================= CUSTOMER PICKUPS =================
    const pendingCustomerPickups = await Order.findAll({
      where: {
        ...storeCondition,
        deliveryType: "pickup",
        pickupOtpVerified: false,
        status: {
          [Op.in]: ["confirmed", "packed"]
        }
      },
      include: [
        {
          model: Store,
          as: "store",
          attributes: ["id", "name"]
        }
      ],
      attributes: [
        "orderNumber",
        "pickupOtp",
        "createdAt",
        "totalAmount"
      ],
      order: [["createdAt", "ASC"]]
    });

    // ================= RESPONSE =================
    return res.json({
      success: true,
      data: {
        role: isSuperAdmin ? "superAdmin" : "storeAdmin",
        storeInfo: isSuperAdmin
          ? "All Stores"
          : `Store ID: ${adminStoreId}`,

        deliveryBoyPickups: pendingDeliveryPickups.map(order => ({
          orderNumber: order.orderNumber,
          otp: order.deliveryPickupOtp,
          deliveryBoy: order.deliveryBoy
            ? {
                id: order.deliveryBoy.id,
                name: order.deliveryBoy.name,
                mobile: order.deliveryBoy.mobile
              }
            : null,
          deliveryDate: order.deliveryDate,
          totalAmount: order.totalAmount,
          storeName: order.store?.name
        })),

        customerPickups: pendingCustomerPickups.map(order => ({
          orderNumber: order.orderNumber,
          otp: order.pickupOtp,
          orderDate: order.createdAt,
          totalAmount: order.totalAmount,
          storeName: order.store?.name
        }))
      }
    });

  } catch (err) {
    console.error("Get pending pickups error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * CUSTOMER: Get my pickup order OTP
 */
exports.getMyPickupOtp = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user?.id;

    const order = await Order.findOne({ 
      where: { orderNumber, userId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.deliveryType !== "pickup") {
      return res.status(400).json({
        success: false,
        message: "This is not a pickup order"
      });
    }

    if (order.pickupOtpVerified) {
      return res.json({
        success: true,
        message: "Order already picked up",
        data: {
          orderNumber: order.orderNumber,
          isPickedUp: true,
          pickupTime: order.storeHandoverAt
        }
      });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        otp: order.pickupOtp,
        status: order.status,
        instructions: "Show this OTP at the store counter to collect your order"
      }
    });
  } catch (err) {
    console.error("Get pickup OTP error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * DELIVERY BOY: Get my delivery pickup OTP
 */
exports.getMyDeliveryPickupOtp = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const deliveryBoyId = req.deliveryBoy?.id;

    const order = await Order.findOne({ 
      where: { orderNumber, deliveryBoyId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you"
      });
    }

    if (order.deliveryType !== "delivery") {
      return res.status(400).json({
        success: false,
        message: "This is not a delivery order"
      });
    }

    if (order.deliveryPickupOtpVerified) {
      return res.json({
        success: true,
        message: "Items already picked up from store",
        data: {
          orderNumber: order.orderNumber,
          isPickedUp: true,
          handoverTime: order.storeHandoverAt
        }
      });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        otp: order.deliveryPickupOtp,
        instructions: "Show this OTP at the store counter to collect items for delivery"
      }
    });
  } catch (err) {
    console.error("Get delivery pickup OTP error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};