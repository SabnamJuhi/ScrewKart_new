const { Order } = require("../../models");

exports.markDeliveredCOD = async (req, res) => {
  try {
    const { orderNumber } = req.body;

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    if (order.paymentMethod !== "COD")
      throw new Error("Not a COD order");

    await order.update({
      status: "delivered",
    });

    return res.json({
      success: true,
      message: "Order marked as delivered. Awaiting payment.",
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
