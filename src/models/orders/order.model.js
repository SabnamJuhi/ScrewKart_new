// const { DataTypes } = require("sequelize");
// const sequelize = require("../../config/db");

// const Order = sequelize.define("Order", {
//   orderNumber: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     unique: true,
//   },
//   subtotal: {
//     type: DataTypes.DECIMAL(10, 2),
//     allowNull: false,
//   },
//   shippingFee: {
//     type: DataTypes.DECIMAL(10, 2),
//     defaultValue: 0.0,
//   },
//   totalAmount: {
//     type: DataTypes.DECIMAL(10, 2),
//     allowNull: false,
//   },
//   taxAmount: {
//   type: DataTypes.DECIMAL(10, 2),
//   defaultValue: 0.0,
//   },
//   status: {
//     type: DataTypes.ENUM("pending", "confirmed", "shipped", "delivered", "cancelled"),
//     defaultValue: "pending",
//   },
//   paymentStatus: {
//     type: DataTypes.ENUM("unpaid", "paid", "failed", "refunded"),
//     defaultValue: "unpaid",
//   },
//   paymentMethod: {
//     type: DataTypes.STRING, // e.g., 'Razorpay', 'Stripe', 'COD'
//   },
//   transactionId: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
// });

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
        "processing",
        "shipped",
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
      type: DataTypes.ENUM("unpaid", "paid", "failed", "refund_pending", "refunded"),
      defaultValue: "unpaid",
    },

    paymentMethod: {
      type: DataTypes.STRING, // ICICI, Razorpay, COD, Stripe etc.
    },

    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // NEW → hashed OTP storage
    // deliveryOtpHash: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    deliveryBoyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // NEW → OTP expiry timestamp
    // otpExpiresAt: {
    //   type: DataTypes.DATE,
    //   allowNull: true,
    // },
    otpVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // // --- Address Snapshot (important for history) ---
    // shippingAddress: {
    //   type: DataTypes.JSON,
    //   allowNull: false,
    // },

    // --- Timeline Tracking ---
    confirmedAt: DataTypes.DATE,
    shippedAt: DataTypes.DATE,
    deliveredAt: DataTypes.DATE,
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
