const express = require("express");
const { getNotifications, markNotificationRead, deleteNotification } = require("../../controllers/notificationsForApp/getNotifications.controller");
const router = express.Router()
const {protected} = require("../../middleware/user.logout.middleware")



router.get("/order/status", protected, getNotifications);
router.patch("/notifications/:id/read", protected, markNotificationRead);
router.delete("/appNotification/:id", protected, deleteNotification)

module.exports = router

// {
//   "success": true
// }