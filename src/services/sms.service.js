const axios = require("axios");

const sendOTP = async (mobile, otp) => {
  try {
    await axios.post("https://api.msg91.com/api/v5/otp", {
      template_id: process.env.MSG91_TEMPLATE_ID,
      mobile: `91${mobile}`,
      otp: otp
    }, {
      headers: {
        authkey: process.env.MSG91_AUTH_KEY,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("MSG91 Error:", error.response?.data || error.message);
    throw new Error("Failed to send OTP");
  }
};

module.exports = { sendOTP };