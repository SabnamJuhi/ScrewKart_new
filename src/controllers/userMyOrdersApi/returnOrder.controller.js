const { Order } = require("../../models");

exports.returnOrder = async (req, res) => {
try {
const { orderNumber } = req.params;


const order = await Order.findOne({ where: { orderNumber } });
if (!order) throw new Error("Order not found");


if (order.status !== "delivered")
throw new Error("Only delivered orders can be returned");


await order.update({
status: "returned",
paymentStatus: "refund_pending",
});


res.json({ success: true, message: "Return initiated" });
} catch (err) {
res.status(400).json({ success: false, message: err.message });
}
};