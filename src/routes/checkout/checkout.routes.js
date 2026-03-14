const express = require("express");
const router = express.Router();
const { protected } = require("../../middleware/user.logout.middleware");
const { buyNowCheckout } = require("../../controllers/order/checkout/buyNow.controller");

router.post("/buyNow", protected, buyNowCheckout);

module.exports = router;
