const { DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

const OfferApplicableCategory = sequelize.define(
  "OfferApplicableCategory",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    offerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    subCategoryId: {
      type: DataTypes.INTEGER
    },

    subOfferId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: "offer_applicable_categories",
    timestamps: false
  }
)

module.exports = OfferApplicableCategory
