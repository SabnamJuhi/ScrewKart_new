const { Store } = require("../../models");
const { getDistanceKm } = require("../../utils/distance");
const { isStoreOpen } = require("../../utils/storeStatus");

/* ---------------- GET NEAREST STORE (🔥 CORE BLINKIT API) ---------------- */
exports.getNearestStore = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      throw new Error("User location required");
    }

    const stores = await Store.findAll({
      where: { isActive: true },
    });

    let availableStores = [];

    for (let store of stores) {
      const distance = getDistanceKm(
        latitude,
        longitude,
        store.latitude,
        store.longitude
      );

      if (distance <= store.deliveryRadius) {
        availableStores.push({
          ...store.toJSON(),
          distance,
          isOpen: isStoreOpen(store),
        });
      }
    }

    if (!availableStores.length) {
      return res.json({
        success: false,
        message: "No stores available in your area",
      });
    }

    // ✅ Blinkit priority sorting
    availableStores.sort((a, b) => {
      if (a.isOpen !== b.isOpen) return b.isOpen - a.isOpen;
      if (a.avgDeliveryTime !== b.avgDeliveryTime)
        return a.avgDeliveryTime - b.avgDeliveryTime;
      return a.distance - b.distance;
    });

    res.json({
      success: true,
      data: availableStores[0], // best store
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};