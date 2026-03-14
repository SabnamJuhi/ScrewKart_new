// // models/productReview.model.js
// const { Model, DataTypes } = require("sequelize")
// const sequelize = require("../../config/db")

// class ProductReview extends Model {}

// ProductReview.init(
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true
//     },
//     productId: {
//       type: DataTypes.INTEGER,
//       allowNull: false
//     },
//     userId: DataTypes.INTEGER,
//     userName: DataTypes.STRING,
//     isVerifiedBuyer: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false
//     },
//     rating: DataTypes.INTEGER,
//     title: DataTypes.STRING,
//     reviewText: DataTypes.TEXT,
//     likes: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0
//     },
//     dislikes: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0
//     }
//   },
//   {
//     sequelize,
//     modelName: "ProductReview",
//     tableName: "product_reviews"
//   }
// )

// module.exports = ProductReview




// models/products/productReview.model.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class ProductReview extends Model {}

ProductReview.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    productId: { type: DataTypes.INTEGER, allowNull: false },

    userId: { type: DataTypes.INTEGER, allowNull: false },

    userName: DataTypes.STRING,

    isVerifiedBuyer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    rating: { type: DataTypes.INTEGER, allowNull: false },

    title: DataTypes.STRING,

    reviewText: DataTypes.TEXT,

    // cached counters
    likes: { type: DataTypes.INTEGER, defaultValue: 0 },
    dislikes: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: "ProductReview",
    tableName: "product_reviews",
  }
);

module.exports = ProductReview;