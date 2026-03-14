const { Order } = require("../../models");

exports.confirmCodPayment = async (req, res) => {
  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      throw new Error("orderNumber is required");
    }

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    // Only COD orders allowed
    if (order.paymentMethod !== "COD") {
      throw new Error("This order is not COD");
    }

    // Must already be delivered via OTP
    if (order.status !== "delivered") {
      throw new Error("Order must be delivered before completing COD payment");
    }

    // Already completed safety check
    if (order.paymentStatus === "paid" || order.status === "completed") {
      throw new Error("COD payment already confirmed");
    }

    // ✅ Update order to completed
    await order.update({
      status: "completed",
      paymentStatus: "paid",
      completedAt: new Date(),
      codCollectedAt: new Date(), // optional field if you keep
    });

    return res.json({
      success: true,
      message: "COD payment confirmed. Order completed successfully.",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
