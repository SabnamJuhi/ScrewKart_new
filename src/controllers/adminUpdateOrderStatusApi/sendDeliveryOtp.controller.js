const crypto = require("crypto");
const { Order, OrderAddress } = require("../../models");
const {
  sendSMS,
  sendWhatsApp,
} = require("../../services/notification.service");
const DeliveryBoy = require("../../models/orders/deliveryBoy.model");
const { sendDeliveryAssignmentEmail } = require("../../utils/email");

/* ---------------- PHONE NORMALIZER ---------------- */
const normalizePhone = (phone) => {
  if (!phone) return null;

  phone = phone.toString().replace(/\D/g, "");

  // remove leading 0
  if (phone.startsWith("0")) phone = phone.substring(1);

  // remove country code if already present
  if (phone.startsWith("91") && phone.length === 12) {
    phone = phone.substring(2);
  }

  return phone;
};

/* ================= SEND DELIVERY OTP ================= */
exports.sendDeliveryOtp = async (req, res) => {
  try {
    const { orderNumber, deliveryBoyId } = req.body;

    if (!orderNumber || !deliveryBoyId) {
      throw new Error("orderNumber and deliveryBoyId are required");
    }

    /* ---------- FIND ORDER + ADDRESS ---------- */
    const order = await Order.findOne({
      where: { orderNumber },
      include: [{ model: OrderAddress, as: "address" }],
    });

    if (!order) throw new Error("Order not found");

    /* ---------- FIND DELIVERY BOY ---------- */
    const boy = await DeliveryBoy.findByPk(deliveryBoyId);
    if (!boy) throw new Error("Delivery boy not found");

    const now = new Date();

    /* ---------- BLOCK RESEND IF OTP VALID ---------- */
    if (order.otpExpiresAt && now < new Date(order.otpExpiresAt)) {
      const secondsLeft = Math.ceil(
        (new Date(order.otpExpiresAt) - now) / 1000,
      );
      throw new Error(`OTP already sent. Try again in ${secondsLeft} seconds.`);
    }

    /* ---------- CLEAR OLD OTP ---------- */
    await order.update({
      deliveryOtpHash: null,
      otpExpiresAt: null,
      otpVerified: false,
    });

    /* ---------- CUSTOMER DETAILS FROM REAL DB ---------- */
    const customerName = order.address?.fullName || "N/A";

    const phoneRaw = order.address?.phoneNumber;
    const phone = normalizePhone(phoneRaw);

    if (!phone) throw new Error("Customer phone number not found");

    const address = `
${order.address?.addressLine || ""}
${order.address?.city || ""}
${order.address?.state || ""}
${order.address?.country || ""}
${order.address?.zipCode || ""}
`
      .replace(/\s+/g, " ")
      .trim();

    /* ---------- GENERATE OTP ---------- */
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    /* ==================================================
       1️⃣ SEND EMAIL TO DELIVERY BOY (ALWAYS REQUIRED)
    ================================================== */
    const verificationLink = `${process.env.FRONTEND_URL}/verify-delivery?orderNumber=${orderNumber}`;
    let codPaymentLink = null;
    if (order.paymentMethod === "COD") {
      codPaymentLink = `${process.env.FRONTEND_URL}/confirm-cod-payment?orderNumber=${orderNumber}`;
    }

    await sendDeliveryAssignmentEmail({
      to: boy.email,
      orderNumber,
      customerName,
      phone,
      address,
      otp, // visible in email for DEV
      verificationLink,
      codPaymentLink,
      isCOD: order.paymentMethod === "COD"
    });

    /* ==================================================
       2️⃣ TRY SMS + WHATSAPP (DON’T BREAK FLOW)
    ================================================== */
    try {
      await sendSMS(phone, otp);
      await sendWhatsApp(phone, otp);
    } catch (notifyErr) {
      console.error("SMS/WhatsApp failed but email sent → continuing");
    }

    /* ==================================================
       3️⃣ SAVE OTP IN DB
    ================================================== */
    await order.update({
      status: "out_for_delivery",
      deliveryBoyId: boy.id,
      deliveryOtpHash: otpHash,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      otpVerified: false,
    });

    /* ==================================================
       4️⃣ DEV CONSOLE LOG
    ================================================== */
    console.log("=================================");
    console.log("📦 DELIVERY OTP GENERATED");
    console.log("Order:", orderNumber);
    console.log("Customer:", customerName);
    console.log("Phone:", phone);
    console.log("Address:", address);
    console.log("OTP:", otp);
    console.log("Sent to email:", boy.email);
    console.log("=================================");

    /* ==================================================
       5️⃣ RESPONSE (OTP ONLY IN DEV)
    ================================================== */
    const isDev = process.env.NODE_ENV !== "production";

    return res.json({
      success: true,
      message: "Delivery boy assigned and OTP processed",
      ...(isDev && { devOtp: otp }),
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
