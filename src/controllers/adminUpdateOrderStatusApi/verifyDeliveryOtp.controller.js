const crypto = require("crypto");
const { Order } = require("../../models");

exports.verifyDeliveryOtp = async (req, res) => {
  try {
    const { orderNumber, otp } = req.body;

    if (!orderNumber || !otp) {
      throw new Error("orderNumber and otp are required");
    }

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    // Already completed
    if (["delivered", "completed"].includes(order.status)) {
      throw new Error("Order already delivered");
    }

    // Must be out_for_delivery
    if (order.status !== "out_for_delivery") {
      throw new Error("Order is not out for delivery");
    }

    // Expiry check (timezone-safe)
    if (
      !order.otpExpiresAt ||
      Date.now() > new Date(order.otpExpiresAt).getTime()
    ) {
      throw new Error("OTP expired. Please resend OTP.");
    }

    // Hash incoming OTP
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (otpHash !== order.deliveryOtpHash) {
      throw new Error("Invalid OTP");
    }

    // ✅ OTP verified
    const updateData = {
      status: "delivered",
      deliveredAt: new Date(),
      otpVerified: true,
      deliveryOtpHash: null,
      otpExpiresAt: null,
    };

    // 💳 Online payment → auto complete
    if (order.paymentMethod !== "COD") {
      updateData.status = "completed";
      updateData.completedAt = new Date();
      updateData.paymentStatus = "paid";
    }

    await order.update(updateData);

    return res.json({
      success: true,
      message:
        order.paymentMethod === "COD"
          ? "OTP verified. Order delivered. Awaiting COD payment."
          : "OTP verified. Order completed successfully.",
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
