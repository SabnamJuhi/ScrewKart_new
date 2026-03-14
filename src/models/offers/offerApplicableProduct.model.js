const { DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

const OfferApplicableProduct = sequelize.define(
  "OfferApplicableProduct",
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

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    subOfferId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: "offer_applicable_products",
    timestamps: false
  }
)

module.exports = OfferApplicableProduct
