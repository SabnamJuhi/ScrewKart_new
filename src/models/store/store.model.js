const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Store = sequelize.define(
  "Store",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    deliveryRadius: {
      type: DataTypes.FLOAT, // in KM
      allowNull: false,
      defaultValue: 8,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    // ⏱ Store Timing
    openTime: {
      type: DataTypes.TIME, // "08:00"
      allowNull: false,
    },

    closeTime: {
      type: DataTypes.TIME, // "22:00"
      allowNull: false,
    },

    // ⚡ Blinkit-style cutoff
    lastOrderTime: {
      type: DataTypes.TIME, // "21:30"
      allowNull: false,
    },

    // 🔁 Manual override (admin control)
    isOpenManual: {
      type: DataTypes.BOOLEAN,
      allowNull: true, // null = auto logic
    },

    avgDeliveryTime: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: false,
      defaultValue: 15,
    },
  },
  {
    tableName: "stores",
    timestamps: true,
  }
);

module.exports = Store;