// models/products/reviewReaction.model.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class ReviewReaction extends Model {}

ReviewReaction.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    reviewId: { type: DataTypes.INTEGER, allowNull: false },

    userId: { type: DataTypes.INTEGER, allowNull: false },

    type: {
      type: DataTypes.ENUM("like", "dislike"),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "ReviewReaction",
    tableName: "review_reactions",
    indexes: [
      {
        unique: true,
        fields: ["reviewId", "userId"], // one reaction per user per review
      },
    ],
  }
);

module.exports = ReviewReaction;
