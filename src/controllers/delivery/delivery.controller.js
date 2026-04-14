
const sequelize = require("../../config/db");
const { DeliverySlot, Order } = require("../../models");
const { getDistanceKm } = require("../../utils/distance");

exports.createOrderWithSlot = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { slotId, address, orderItems } = req.body;

    // 1. Distance Check
    const distanceKm = await getDistanceKm(address);

    if (distanceKm > 8) {
      return res.json({
        success: false,
        message: "Delivery unavailable. Choose pickup.",
        allowPickup: true,
      });
    }

    // 2. Lock slot
    const slot = await DeliverySlot.findByPk(slotId, {
      lock: true,
      transaction: t,
    });

    if (!slot || slot.currentOrders >= slot.maxCapacity) {
      throw new Error("Slot full");
    }

    // 3. Create Order
    const order = await Order.create(
      {
        ...req.body,
        deliverySlotId: slot.id,
        deliveryDate: slot.date,
        distanceKm,
        deliveryType: "delivery",
      },
      { transaction: t }
    );

    // 4. Update slot
    slot.currentOrders += 1;

    if (slot.currentOrders >= slot.maxCapacity) {
      slot.status = "full";
    }

    await slot.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    await t.rollback();

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};