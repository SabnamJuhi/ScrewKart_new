const { DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

const OfferSub = sequelize.define(
  "OfferSub",
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

    code: {
      type: DataTypes.STRING,
      allowNull: false
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false
    },

    description: {
      type: DataTypes.TEXT
    },

    discountType: {
      type: DataTypes.ENUM("FLAT", "PERCENTAGE"),
      allowNull: false
    },

    discountValue: {
      type: DataTypes.FLOAT,
      allowNull: false
    },

    maxDiscount: {
      type: DataTypes.FLOAT
    },

    minOrderValue: {
      type: DataTypes.FLOAT
    },

    bank: {
      type: DataTypes.STRING
    },

    paymentMethod: {
      type: DataTypes.STRING
    },

    validFrom: {
      type: DataTypes.DATE,
      allowNull: false
    },

    validTill: {
      type: DataTypes.DATE,
      allowNull: false
    },

    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  },
  {
    tableName: "offer_subs",
    timestamps: true
  }
)

module.exports = OfferSub
