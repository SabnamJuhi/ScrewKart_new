// models/notification.model.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Notification = sequelize.define("Notification", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  title: DataTypes.STRING,
  message: DataTypes.TEXT,
  type: {
    type: DataTypes.STRING, // ORDER_STATUS
    defaultValue: "ORDER_STATUS",
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: "notifications",
  timestamps: true,
});

module.exports = Notification;