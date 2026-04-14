const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class DeliverySlot extends Model {}

DeliverySlot.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    maxCapacity: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },

    currentOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    status: {
      type: DataTypes.ENUM("available", "full", "closed"),
      defaultValue: "available",
    },
  },
  {
    sequelize,
    modelName: "DeliverySlot",
    tableName: "delivery_slots",
    timestamps: true,

    // ✅ CORRECT PLACE
    // In DeliverySlot model definition
    indexes: [
      {
        unique: true,
        fields: ["date", "startTime"],
      },
      {
        fields: ["date", "status"], // For faster queries
      },
      {
        fields: ["date", "startTime", "status"], // For slot availability queries
      },
    ],
  },
);

module.exports = DeliverySlot;
