// services/notification.service.js
const { Notification } = require("../models");
const Admin = require("../models/admin.model");


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


exports.createDeliveryNotification = async ({
  deliveryBoyId,
  orderId,
  orderNumber,
}) => {
  await Notification.create({
    deliveryBoyId,
    orderId,
    title: "New Order Assigned",
    message: `Order #${orderNumber} has been assigned to you`,
  });
};




exports.createAdminNotification = async ({
  orderId,
  orderNumber,
  storeId,
  type,
}) => {
  let message = "";

  if (type === "confirmed") {
    message = `Order #${orderNumber} has been confirmed`;
  } else if (type === "cancelled") {
    message = `Order #${orderNumber} has been cancelled`;
  } else if (type === "completed") {
    message = `Order #${orderNumber} has been completed`;
  }

  // ✅ SUPER ADMIN (ALL)
  const superAdmins = await Admin.findAll({
    where: { role: "superAdmin" },
  });

  // ✅ STORE ADMIN (ONLY SAME STORE)
  const storeAdmins = await Admin.findAll({
    where: {
      role: "storeAdmin",
      storeId: storeId,
    },
  });

  const allAdmins = [...superAdmins, ...storeAdmins];

  const notifications = allAdmins.map((admin) => ({
    userId: admin.id,
    orderId,
    title: "Admin Alert",
    message,
  }));

  await Notification.bulkCreate(notifications);
};