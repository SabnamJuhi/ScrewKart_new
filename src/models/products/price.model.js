const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class ProductPrice extends Model {}

ProductPrice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // productId: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false
    // },
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mrp: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discountPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: "INR",
    },
  },
  {
    sequelize,
    modelName: "ProductPrice",
    tableName: "product_prices",
  },
);

module.exports = ProductPrice;
