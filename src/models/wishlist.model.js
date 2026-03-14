const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/db");

class Wishlist extends Model {}

Wishlist.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    variantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Wishlist",
    tableName: "wishlists",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["userId", "productId", "variantId"], // prevent duplicates
      },
    ],
  }
);

module.exports = Wishlist;
