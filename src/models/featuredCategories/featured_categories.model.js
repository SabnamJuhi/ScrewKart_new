const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const FeaturedCategory = sequelize.define(
  "FeaturedCategory",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "featured_categories",
    timestamps: true,
  },
);

module.exports = FeaturedCategory;
