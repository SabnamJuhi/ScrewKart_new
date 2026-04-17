// In your routes file
const express = require("express");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");
const { deliveryBoyAuth } = require("../../middleware/deliveryBoy.auth.middleware");
const orderCntrl = require("../../controllers/order/orderStatus.controller");
const { allowAdminRoles } = require("../../middleware/admin.role.middleware");
const { checkStoreAccess } = require("../../middleware/storeAccess.middleware");
const {protected} = require("../../middleware/user.logout.middleware")
const router = express.Router();


// Admin routes
router.put("/:orderNumber/status", adminAuthMiddleware, allowAdminRoles("superAdmin", "storeAdmin"), checkStoreAccess, orderCntrl.updateOrderStatus);
router.put("/:orderNumber/assign-delivery-boy", adminAuthMiddleware, allowAdminRoles("superAdmin", "storeAdmin"), checkStoreAccess, orderCntrl.assignDeliveryBoy);

// Delivery boy routes
router.get("/delivery-boy/orders", deliveryBoyAuth, orderCntrl.getMyAssignedOrders);
// router.put("/:orderNumber/out-for-delivery", deliveryBoyAuth, orderCntrl.markOutForDelivery);
router.put("/:orderNumber/deliver", deliveryBoyAuth, orderCntrl.markAsDelivered);

// Customer routes
router.get("/:orderNumber/timeline", protected, orderCntrl.getOrderTimeline);
// router.delete("/:orderNumber/cancel",  protected, orderCntrl.cancelOrder);

module.exports = router;