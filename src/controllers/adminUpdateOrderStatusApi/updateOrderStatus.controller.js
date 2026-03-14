const { Order } = require("../../models");
const DeliveryBoy = require("../../models/orders/deliveryBoy.model");

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status, courierName, trackingNumber } = req.body;

    // Find the order
    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    // Initialize update object
    const updateData = { status };

    // Only allow shipping if current status is "confirmed"
    if (status === "shipped") {
      if (order.status !== "confirmed") {
        throw new Error(
          `Cannot mark order as shipped. Current status is "${order.status}"`
        );
      }

      // Add shipping info
      updateData.courierName = courierName;
      updateData.trackingNumber = trackingNumber;
      updateData.shippedAt = new Date();
    }

    // Update order
    await order.update(updateData);

    res.json({ success: true, message: "Order status updated" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};




exports.markOutForDelivery = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { deliveryBoyId } = req.body;

    // Validate deliveryBoyId
    if (!deliveryBoyId) {
      throw new Error("deliveryBoyId is required");
    }

    // Check delivery boy exists
    const boy = await DeliveryBoy.findByPk(deliveryBoyId);
    if (!boy) {
      throw new Error("Delivery boy not found");
    }

    // Find the order
    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    // Only shipped orders can move to out_for_delivery
    if (order.status !== "shipped") {
      throw new Error(
        `Cannot mark order as out_for_delivery. Current status: ${order.status}`
      );
    }

    // Update status + assign delivery boy
    await order.update({
      status: "out_for_delivery",
      deliveryBoyId: deliveryBoyId,
      outForDeliveryAt: new Date(),
      // ❌ NO OTP here (already generated in placeOrder)
    });

    res.json({
      success: true,
      message: "Order marked as out for delivery and delivery boy assigned",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};