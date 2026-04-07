const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class VariantPricingSlab extends Model {}

VariantPricingSlab.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    minQty: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    maxQty: {
      type: DataTypes.INTEGER,
      allowNull: true, // NULL = infinite
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get() {
        return Number(this.getDataValue("price"));
      },
    },
  },
  {
    sequelize,
    modelName: "VariantPricingSlab",
    tableName: "variant_pricing_slabs",
  }
);

module.exports = VariantPricingSlab;