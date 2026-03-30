// models/variantSize.model.js
const { Model, DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

class VariantSize extends Model {}

VariantSize.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
     length: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    diameter: {
      type: DataTypes.INTEGER
    },
     approxWeightKg: {
      type: DataTypes.DECIMAL(10,2), 
      allowNull: true
    },

    // stock: {
    //   type: DataTypes.INTEGER,
    //   defaultValue: 0
    // }
  },
  {
    sequelize,
    tableName: "variant_sizes"
  }
)

module.exports = VariantSize
