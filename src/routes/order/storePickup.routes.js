// storePickup.routes.js
const express = require("express");
const router = express.Router();
const storePickupController = require("../../controllers/order/storePickup.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");
const {protected} = require("../../middleware/user.logout.middleware")
const { deliveryBoyAuth } = require("../../middleware/deliveryBoy.auth.middleware");
const { allowAdminRoles } = require("../../middleware/admin.role.middleware");
const { checkStoreAccess } = require("../../middleware/storeAccess.middleware");

// ============ STORE ADMIN ROUTES ============
// Verify delivery boy OTP (when delivery boy picks up items)
router.post("/store/verify-delivery-boy-pickup/:orderNumber", adminAuthMiddleware, allowAdminRoles("superAdmin", "storeAdmin"), checkStoreAccess, storePickupController.verifyDeliveryBoyPickup);

// Verify customer OTP (when customer picks up items)
router.post("/store/verify-customer-pickup/:orderNumber", adminAuthMiddleware, allowAdminRoles("superAdmin", "storeAdmin"), checkStoreAccess, storePickupController.verifyCustomerPickup);

// Get all pending pickups
router.get("/store/pending-pickups", adminAuthMiddleware, allowAdminRoles("superAdmin", "storeAdmin"), checkStoreAccess, storePickupController.getPendingPickups);

// ============ CUSTOMER ROUTES ============
// Get my pickup order OTP
router.get("/customer/pickup-otp/:orderNumber", protected , storePickupController.getMyPickupOtp);

// ============ DELIVERY BOY ROUTES ============
// Get my delivery pickup OTP
router.get("/delivery-boy/pickup-otp/:orderNumber", deliveryBoyAuth, storePickupController.getMyDeliveryPickupOtp);



module.exports = router;