const { Order } = require("../../models");

exports.completeRefund = async (req, res) => {
try {
const { orderNumber } = req.params;


const order = await Order.findOne({ where: { orderNumber } });
if (!order) throw new Error("Order not found");


await order.update({ paymentStatus: "refunded" });


res.json({ success: true, message: "Refund completed" });
} catch (err) {
res.status(400).json({ success: false, message: err.message });
}
};