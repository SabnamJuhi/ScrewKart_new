const { Order } = require("../../models");

exports.collectCODPayment = async (req, res) => {
  try {
    const { orderNumber } = req.body;

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    if (order.paymentMethod !== "COD")
      throw new Error("Not a COD order");

    if (order.status !== "delivered")
      throw new Error("Order must be delivered before payment collection");

    await order.update({
      paymentStatus: "paid",
      status: "completed",
    });

    return res.json({
      success: true,
      message: "COD payment collected. Order completed.",
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
