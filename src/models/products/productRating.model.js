// models/productRating.model.js
const { Model, DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

class ProductRating extends Model {}

ProductRating.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    averageRating: DataTypes.FLOAT,
    totalRatings: DataTypes.INTEGER,
    totalReviews: DataTypes.INTEGER,
    fiveStar: DataTypes.INTEGER,
    fourStar: DataTypes.INTEGER,
    threeStar: DataTypes.INTEGER,
    twoStar: DataTypes.INTEGER,
    oneStar: DataTypes.INTEGER
  },
  {
    sequelize,
    modelName: "ProductRating",
    tableName: "product_ratings"
  }
)

module.exports = ProductRating
