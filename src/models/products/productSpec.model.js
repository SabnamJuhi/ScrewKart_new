const { Model, DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

class ProductSpec extends Model {}

ProductSpec.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    specKey: {
      type: DataTypes.STRING,
      allowNull: false
    },
    specValue: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: "ProductSpec",
    tableName: "product_specs"
  }
)

module.exports = ProductSpec
