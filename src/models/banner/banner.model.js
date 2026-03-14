const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Banner = sequelize.define(
  "Banner",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },

   

    title: { type: DataTypes.STRING, allowNull: false },
    subtitle: { type: DataTypes.TEXT, allowNull: false },
    cta: { type: DataTypes.STRING, allowNull: false },
    link: { type: DataTypes.STRING, allowNull: false },

    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "banners",
    timestamps: true,
  }
);

module.exports = Banner;
