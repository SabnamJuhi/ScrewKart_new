const { DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

const Offer = sequelize.define(
  "Offer",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    offerCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false
    },

    festival: {
      type: DataTypes.STRING
    },

    description: {
      type: DataTypes.TEXT
    },

    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },

    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    tableName: "offers",
    timestamps: true
  }
)

module.exports = Offer
