const axios = require("axios");

// ENV
const {
  NODE_ENV,
  MSG91_AUTH_KEY,
  MSG91_SENDER_ID,
  MSG91_FLOW_ID,

  MSG91_WHATSAPP_AUTH_KEY,
  MSG91_WHATSAPP_NUMBER,
  MSG91_WHATSAPP_TEMPLATE,
} = process.env;

const isDev = NODE_ENV !== "production";

/* -------------------------------------------------- */
/* 📞 FORMAT PHONE NUMBER (India safe)                */
/* -------------------------------------------------- */
const formatPhone = (phone) => {
  if (!phone) return null;

  // remove non-digits
  phone = phone.replace(/\D/g, "");

  // remove leading 0
  if (phone.startsWith("0")) {
    phone = phone.slice(1);
  }

  // add India code if missing
  if (!phone.startsWith("91")) {
    phone = "91" + phone;
  }

  return phone;
};

/* -------------------------------------------------- */
/* 📩 SEND SMS                                        */
/* -------------------------------------------------- */
exports.sendSMS = async (phone, otp) => {
  const formattedPhone = formatPhone(phone);

  if (!formattedPhone) throw new Error("Invalid phone number");

  // 🔹 DEV MODE → only log
  if (isDev) {
    console.log("📱 MOCK SMS →", formattedPhone, "OTP:", otp);
    return true;
  }

  try {
    const url = "https://api.msg91.com/api/v5/flow/";

    const payload = {
      flow_id: MSG91_FLOW_ID,
      sender: MSG91_SENDER_ID,
      mobiles: formattedPhone,
      OTP: otp,
    };

    await axios.post(url, payload, {
      headers: {
        authkey: MSG91_AUTH_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ SMS sent via MSG91 →", formattedPhone);
  } catch (err) {
    console.error("❌ MSG91 SMS error:", err.response?.data || err.message);
    throw new Error("Failed to send SMS");
  }
};

/* -------------------------------------------------- */
/* 💬 SEND WHATSAPP                                   */
/* -------------------------------------------------- */
exports.sendWhatsApp = async (phone, otp) => {
  const formattedPhone = formatPhone(phone);

  if (!formattedPhone) throw new Error("Invalid phone number");

  // 🔹 DEV MODE → only log
  if (isDev) {
    console.log("💬 MOCK WHATSAPP →", formattedPhone, "OTP:", otp);
    return true;
  }

  try {
    const url =
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";

    const payload = {
      integrated_number: MSG91_WHATSAPP_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: MSG91_WHATSAPP_TEMPLATE,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      },
      to: formattedPhone,
    };

    await axios.post(url, payload, {
      headers: {
        authkey: MSG91_WHATSAPP_AUTH_KEY, // ⚠️ DIFFERENT KEY
        "Content-Type": "application/json",
      },
    });

    console.log("✅ WhatsApp sent via MSG91 →", formattedPhone);
  } catch (err) {
    console.error("❌ MSG91 WhatsApp error:", err.response?.data || err.message);
    throw new Error("Failed to send WhatsApp");
  }
};
