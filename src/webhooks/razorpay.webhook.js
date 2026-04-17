const crypto = require("crypto");
const { Order } = require("../models");

exports.handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature !== req.headers["x-razorpay-signature"]) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      console.log("Webhook HIT:", event.event);

      let order = null;

      if (payment.notes?.orderId) {
        order = await Order.findByPk(payment.notes.orderId);
      } else if (payment.qr_code_id) {
        order = await Order.findOne({
          where: { razorpayQrId: payment.qr_code_id },
        });
      }

      if (!order) return res.status(200).json({ success: true });

      if (order.paymentStatus === "paid") {
        return res.status(200).json({ success: true });
      }

      await order.update({
        paymentStatus: "paid",
        paymentId: payment.id,
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Webhook failed");
  }
};
