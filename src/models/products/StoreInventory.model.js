// models/storeProduct.model.js

const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class StoreInventory extends Model {}

StoreInventory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    variantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    variantSizeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "store_inventory",
  },
);

module.exports = StoreInventory;
