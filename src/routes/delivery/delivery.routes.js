const express = require("express");
const router = express.Router();

const slotController = require("../../controllers/delivery/slot.controller");
const deliveryController = require("../../controllers/delivery/delivery.controller");
const {protected} = require("../../middleware/user.logout.middleware")

// Public routes (or protected with admin role)
router.get("/all", slotController.getAllSlotsForDate); // Admin/debug endpoint

// Customer routes (with auth)
router.get("/available", protected, slotController.getSlots);
router.get("/customer-slots", protected, slotController.getCustomerAvailableSlots);

module.exports = router;