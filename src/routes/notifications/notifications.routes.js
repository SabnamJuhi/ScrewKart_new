const express = require("express");
const { markNotificationRead, deleteNotification, getUserNotifications, getDeliveryNotifications, getAdminNotifications, deleteUserNotification, deleteDeliveryNotification, deleteAdminNotification } = require("../../controllers/notificationsForApp/getNotifications.controller");
const router = express.Router()
const {protected} = require("../../middleware/user.logout.middleware");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");
const { deliveryBoyAuth } = require("../../middleware/deliveryBoy.auth.middleware");
const { allowAdminRoles } = require("../../middleware/admin.role.middleware");



router.get("/user/status", protected, getUserNotifications);
router.get("/delivery/status", deliveryBoyAuth , getDeliveryNotifications);
router.get("/admin/status", adminAuthMiddleware, allowAdminRoles("superAdmin", "storeAdmin"), getAdminNotifications);
router.patch("/notifications/:id/read", protected, markNotificationRead);
router.delete("/user/:id", protected, deleteUserNotification);
router.delete("/delivery/:id", deliveryBoyAuth, deleteDeliveryNotification);
router.delete(
  "/admin/:id",
  adminAuthMiddleware,
  allowAdminRoles("superAdmin", "storeAdmin"),
  deleteAdminNotification
);

module.exports = router

// {
//   "success": true
// }