const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class OrderAddress extends Model {}

OrderAddress.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    addressLine: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
     country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
      // Google Location Fields
    latitude: { 
      type: DataTypes.DECIMAL(10, 8), 
      allowNull: true,
    },
    longitude: { 
      type: DataTypes.DECIMAL(11, 8), 
      allowNull: true,
    },
    placeId: { 
      type: DataTypes.STRING, 
      allowNull: true,
    },
    formattedAddress: { 
      type: DataTypes.TEXT, 
      allowNull: true,
    },

    // Virtual field for Google Maps link
    googleMapsLink: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.latitude && this.longitude) {
          return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
        }
        if (this.formattedAddress) {
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.formattedAddress)}`;
        }
        return null;
      }
    },

    // Directions link for delivery partners
    directionsLink: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.latitude && this.longitude) {
          return `https://www.google.com/maps/dir/?api=1&destination=${this.latitude},${this.longitude}`;
        }
        return null;
      }
    },

    // Added Shipping Type field
    shippingType: {
      type: DataTypes.ENUM("delivery", "pickup"),
      allowNull: false,
      defaultValue: "delivery",
    },
  },
  {
    sequelize,
    modelName: "OrderAddress",
    tableName: "order_addresses",
  }
);

module.exports = OrderAddress;