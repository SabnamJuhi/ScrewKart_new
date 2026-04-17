const express = require("express");
const { getNotifications, markNotificationRead } = require("../../controllers/notificationsForApp/getNotifications.controller");
const router = express.Router()
const {protected} = require("../../middleware/user.logout.middleware")



router.get("/order/status", protected, getNotifications);
router.patch("/notifications/:id/read", protected, markNotificationRead);

module.exports = router

// {
//   "success": true
// }