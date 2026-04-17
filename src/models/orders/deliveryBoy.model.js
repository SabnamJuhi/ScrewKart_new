const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const DeliveryBoy = sequelize.define(
  "DeliveryBoy",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false, // hashed password
    },
    area: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vehicleNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    panCard: {
      type: DataTypes.STRING, // file path
      allowNull: true,
    },
    aadharCard: {
      type: DataTypes.STRING, // file path
      allowNull: true,
    },
    drivingLicense: {
      type: DataTypes.STRING, // file path
      allowNull: true,
    },
    profilePhoto: {
      type: DataTypes.STRING, // file path
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    tableName: "delivery_boys",
    timestamps: true,
  },
);

module.exports = DeliveryBoy;
