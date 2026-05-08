// routes/userBillingAddress.routes.js

const express = require("express");

const router = express.Router();

const {protected} = require("../../middleware/user.logout.middleware")

const controller = require("../../controllers/order/userBillingAddress.controller");

router.post("/", protected, controller.createBillingAddress);

router.get("/", protected, controller.getBillingAddresses);

router.put("/:id", protected, controller.updateBillingAddress);

router.delete("/:id", protected, controller.deleteBillingAddress);

module.exports = router;