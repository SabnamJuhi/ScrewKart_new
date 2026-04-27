
const crypto = require("crypto");
const { Order } = require("../models");

exports.handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // ✅ Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    const receivedSignature = req.headers["x-razorpay-signature"];

    if (expectedSignature !== receivedSignature) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;

    // ✅ Handle QR Payment Success
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      console.log("Webhook HIT:", event.event);
      console.log("Payment Data:", payment);

      let order = null;

      // 🔥 1. PRIMARY: Find using orderNumber
      if (payment.notes?.orderNumber) {
        order = await Order.findOne({
          where: { orderNumber: payment.notes.orderNumber },
        });
      }

      // 🔁 2. FALLBACK: Find using QR ID
      if (!order && payment.qr_code_id) {
        order = await Order.findOne({
          where: { razorpayQrId: payment.qr_code_id },
        });
      }

      // ❌ No order found → ignore safely
      if (!order) {
        console.log("Order not found for payment");
        return res.status(200).json({ success: true });
      }

      // ⚠️ Prevent duplicate updates
      if (order.paymentStatus === "paid") {
        return res.status(200).json({ success: true });
      }

      // ✅ Update order
      await order.update({
        paymentStatus: "paid",
        razorpayPaymentId: payment.id,
      });

      console.log(`✅ Payment updated for order ${order.orderNumber}`);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Webhook failed");
  }
};