const {
  Order,
  OrderItem,
  VariantSize,
  ProductVariant,
  sequelize,
} = require("../../models");

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.cancelOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({
      where: { orderNumber },
      include: [{ model: OrderItem }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) throw new Error("Order not found");

    if (["shipped", "out_for_delivery", "delivered"].includes(order.status)) {
      throw new Error("Order cannot be cancelled now");
    }

    const isCOD = order.paymentMethod?.toLowerCase() === "cod";

    // -----------------------------
    // Update cancel state
    // -----------------------------
    order.status = "cancelled";
    order.paymentStatus = isCOD ? "unpaid" : "refund_pending";
    order.cancelledAt = new Date();

    await order.save({ transaction: t });

    // -----------------------------
    // COD → restore stock immediately
    // -----------------------------
    if (isCOD) {
      for (const item of order.OrderItems) {
        await VariantSize.increment("stock", {
          by: item.quantity,
          where: { id: item.sizeId },
          transaction: t,
        });

        await ProductVariant.increment("totalStock", {
          by: item.quantity,
          where: { id: item.variantId },
          transaction: t,
        });
      }
    }

    await t.commit();

    // -----------------------------
    // ONLINE → call Razorpay refund
    // -----------------------------
    if (!isCOD && order.transactionId) {
      await razorpay.payments.refund(order.transactionId, {
        amount: Math.round(order.totalAmount * 100), // paisa
        notes: { orderNumber: order.orderNumber },
      });
    }

    res.json({
      success: true,
      message: isCOD
        ? "COD order cancelled and stock restored"
        : "Order cancelled. Refund initiated.",
    });
  } catch (err) {
    await t.rollback();

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
