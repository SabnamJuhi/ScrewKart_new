const axios = require("axios");

const sendOTP = async (mobile, otp) => {
  try {
    const response = await fetch("https://api.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: `91${mobile}`,
        otp: otp,
      }),
    });

    const data = await response.json();

    // ✅ IMPORTANT: check response manually (fetch doesn't throw on 4xx/5xx)
    if (!response.ok) {
      console.error("❌ MSG91 Error:", data);
      throw new Error("Failed to send OTP");
    }

    console.log("✅ MSG91 Success:", data);

  } catch (error) {
    console.error("❌ Fetch Error:", error.message);
    throw error;
  }
};


const sendSMS = async ({ mobile, templateId, variables }) => {
  try {
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "authkey": process.env.MSG91_AUTH_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        short_url: "0",
        recipients: [
          {
            mobiles: `91${mobile}`,
            ...variables // dynamic values
          }
        ]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ SMS Error:", data);
      throw new Error("SMS failed");
    }

    console.log("✅ SMS Sent:", data);

    return data;

  } catch (error) {
    console.error("❌ SMS Exception:", error.message);
    throw error;
  }
};


module.exports = { sendOTP, sendSMS };