// module.exports = Order;

const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Order = sequelize.define(
  "Order",
  {
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "store_id", // 👈 VERY IMPORTANT (match DB column)
    },

    // --- Amounts ---
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    shippingFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    // --- Order Lifecycle ---
    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed",
        "picking",
        "packed",
        "processing",
        "shipped",
        "dispatched",
        "out_for_delivery",
        "delivered",
        "completed",
        "cancelled",
        "returned",
      ),
      defaultValue: "pending",
    },

    // --- Payment ---
    paymentStatus: {
      type: DataTypes.ENUM(
        "unpaid",
        "paid",
        "failed",
        "refund_pending",
        "refunded",
      ),
      defaultValue: "unpaid",
    },

    paymentMethod: {
      type: DataTypes.STRING, // ICICI, Razorpay, COD, Stripe etc.
    },

    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deliveryBoyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pickupOtp: { type: DataTypes.STRING },
    deliveryPickupOtp: { type: DataTypes.STRING },
    otpVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    pickupOtpVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deliveryPickupOtpVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    invoiceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    invoiceStatus: {
      type: DataTypes.ENUM("pending", "generated", "failed"),
      defaultValue: "pending",
    },

    deliverySlotId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    deliveryDate: {
      type: DataTypes.DATEONLY,
    },

    distanceKm: {
      type: DataTypes.FLOAT,
    },

    deliveryType: {
      type: DataTypes.ENUM("delivery", "pickup"),
      defaultValue: "delivery",
    },

    // --- Timeline Tracking ---
    confirmedAt: DataTypes.DATE,
    pickingAt: DataTypes.DATE,
    packedAt: DataTypes.DATE,
    shippedAt: DataTypes.DATE,
    outForDeliveryAt: DataTypes.DATE,
    deliveredAt: DataTypes.DATE,
    dispatchedAt: DataTypes.DATE,
    completedAt: DataTypes.DATE,
    cancelledAt: DataTypes.DATE,
    refundedAt: DataTypes.DATE,
  },
  {
    tableName: "orders",
    timestamps: true,
  },
);

module.exports = Order;
