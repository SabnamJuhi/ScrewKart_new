const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class ProductAttribute extends Model {}

ProductAttribute.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    productId: { type: DataTypes.INTEGER, allowNull: false },
    variantId: { type: DataTypes.INTEGER, allowNull: true },

    attributeKey: {
      type: DataTypes.STRING, // material, grade, finish
      allowNull: false,
    },

    attributeValue: {
      type: DataTypes.STRING, // SS304, 8.8, Zinc
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "product_attributes",
  }
);

module.exports = ProductAttribute;