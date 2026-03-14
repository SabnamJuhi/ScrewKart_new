// models/userAddress.model.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class UserAddress extends Model {}

UserAddress.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    userId: { type: DataTypes.INTEGER, allowNull: false },

    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    addressLine: { type: DataTypes.TEXT, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    zipCode: { type: DataTypes.STRING, allowNull: false },

    // New Google Location Fields
    latitude: { 
      type: DataTypes.DECIMAL(10, 8), 
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: { 
      type: DataTypes.DECIMAL(11, 8), 
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    placeId: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: "Google Maps Place ID"
    },
    formattedAddress: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      comment: "Full formatted address from Google"
    },


    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "UserAddress",
    tableName: "user_addresses",
    timestamps: true,
  },
);

module.exports = UserAddress;
