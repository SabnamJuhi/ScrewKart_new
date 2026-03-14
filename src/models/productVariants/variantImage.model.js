// models/variantImage.model.js
const { Model, DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

class VariantImage extends Model {}

VariantImage.init(
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
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: "variant_images",
    timestamps: false
  }
)

module.exports = VariantImage
