const express = require("express")
const router = express.Router()

const { verifyOtp } = require("../../controllers/otpVerification/userOtpVerifyAndLogin.controller");
const { sendOtp } = require("../../controllers/otpVerification/userOtpSend.controller");


router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router