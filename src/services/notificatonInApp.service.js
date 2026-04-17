// services/notification.service.js
const { Notification } = require("../models");

const STATUS_MESSAGES = {
  pending: "Your order has been placed and is pending confirmation.",
  confirmed: "Your order has been confirmed.",
  picking: "Your order is being picked from the store.",
  packed: "Your order has been packed.",
  processing: "Your order is being processed.",
  shipped: "Your order has been shipped.",
  dispatched: "Your order has been dispatched.",
  out_for_delivery: "Your order is out for delivery.",
  delivered: "Your order has been delivered.",
  completed: "Your order has been completed successfully.",
  cancelled: "Your order has been cancelled.",
  returned: "Your order has been returned.",
};

exports.createOrderNotification = async ({
  userId,
  orderId,
  orderNumber,
  status,
}) => {
  const message =
    STATUS_MESSAGES[status] ||
    `Your order ${orderNumber} status updated to ${status}`;

  await Notification.create({
    userId,
    orderId,
    title: "Order Update",
    message: `Order #${orderNumber}: ${message}`,
  });
};