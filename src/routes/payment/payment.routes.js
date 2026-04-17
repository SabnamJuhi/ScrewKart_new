const express = require("express");
const router = express.Router();

const { generateCODQR } = require("../../controllers/payment/codQr.controller");
const { deliveryBoyAuth } = require("../../middleware/deliveryBoy.auth.middleware");


// Delivery boy should be authenticated
router.post("/cod/generate-qr", deliveryBoyAuth, generateCODQR);
// router.post("/verify-cod-payment", verifyCODPayment);

module.exports = router;