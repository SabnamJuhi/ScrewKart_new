const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class ProductMeasurement extends Model {}

ProductMeasurement.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    productId: { type: DataTypes.INTEGER, allowNull: false },
    variantId: { type: DataTypes.INTEGER, allowNull: true },

    measurementId: { type: DataTypes.INTEGER, allowNull: false },

    value: {
      type: DataTypes.STRING, // "40", "8", "1.25"
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "product_measurements",
  }
);

module.exports = ProductMeasurement;