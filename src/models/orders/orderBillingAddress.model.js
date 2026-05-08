const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class OrderBillingAddress extends Model {}

OrderBillingAddress.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    gstNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
     panNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    addressLine1: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    addressLine2: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    landmark: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    pincode: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    country: {
      type: DataTypes.STRING,
      defaultValue: "India",
    },
  },
  {
    sequelize,
    modelName: "OrderBillingAddress",
    tableName: "order_billing_addresses",
    timestamps: true,
  }
);

module.exports = OrderBillingAddress;