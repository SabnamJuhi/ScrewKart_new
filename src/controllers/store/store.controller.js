// controllers/store.controller.js

const { Store } = require("../../models");
const { isStoreOpen } = require("../../utils/storeStatus");

// const { getDistanceKm } = require("../../utils/distance");

/* ---------------- CREATE STORE ---------------- */
exports.createStore = async (req, res) => {
  try {
    const {
      name,
      latitude,
      longitude,
      deliveryRadius,
      openTime,
      closeTime,
      lastOrderTime,
      avgDeliveryTime,
    } = req.body;

    if (!name || !latitude || !longitude) {
      throw new Error("Name, latitude and longitude are required");
    }

    const store = await Store.create({
      name,
      latitude,
      longitude,
      deliveryRadius,
      openTime,
      closeTime,
      lastOrderTime,
      avgDeliveryTime,
      isActive: true,
    });

    res.json({ success: true, data: store });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ---------------- GET ALL STORES ---------------- */
exports.getAllStores = async (req, res) => {
  try {
    const stores = await Store.findAll({
      where: { isActive: true },
      order: [["createdAt", "DESC"]],
    });

    const updatedStores = stores.map((store) => ({
      ...store.toJSON(),
      isOpen: isStoreOpen(store),
    }));

    res.json({
      success: true,
      count: updatedStores.length,
      data: updatedStores,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET STORE BY ID ---------------- */
exports.getStoreById = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await Store.findByPk(id);

    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...store.toJSON(),
        isOpen: isStoreOpen(store),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStore = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await Store.findByPk(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    // ✅ Destructure INCLUDING isOpenManual
    let {
      name,
      latitude,
      longitude,
      deliveryRadius,
      openTime,
      closeTime,
      lastOrderTime,
      avgDeliveryTime,
      isActive,
      isOpenManual,
    } = req.body;

    // ✅ Normalize boolean (VERY IMPORTANT)
    if (isOpenManual !== undefined) {
      if (isOpenManual === "true") isOpenManual = true;
      else if (isOpenManual === "false") isOpenManual = false;
      else if (isOpenManual === null) isOpenManual = null;
    }

    // ✅ Update store
    await store.update({
      name: name ?? store.name,
      latitude: latitude ?? store.latitude,
      longitude: longitude ?? store.longitude,
      deliveryRadius: deliveryRadius ?? store.deliveryRadius,
      openTime: openTime ?? store.openTime,
      closeTime: closeTime ?? store.closeTime,
      lastOrderTime: lastOrderTime ?? store.lastOrderTime,
      avgDeliveryTime: avgDeliveryTime ?? store.avgDeliveryTime,
      isActive: isActive ?? store.isActive,
      isOpenManual:
        isOpenManual !== undefined ? isOpenManual : store.isOpenManual,
    });

    // ✅ Get store status (clean structure)
    const status = isStoreOpen(store);

    res.json({
      success: true,
      message: "Store updated successfully",
      data: {
        ...store.toJSON(),

        isOpen: status.isOpen,
        acceptsOrders: status.acceptsOrders,
        statusMessage: status.message,
        status: status.status,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
/* ---------------- DELETE (SOFT DELETE) ---------------- */
exports.deleteStore = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await Store.findByPk(id);

    if (!store) throw new Error("Store not found");

    await store.update({ isActive: false });

    res.json({
      success: true,
      message: "Store deactivated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- TOGGLE STORE (ADMIN FORCE OPEN/CLOSE) ---------------- */
exports.toggleStoreStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isOpenManual } = req.body;

    const store = await Store.findByPk(id);

    if (!store) throw new Error("Store not found");

    await store.update({ isOpenManual });

    res.json({
      success: true,
      message: "Store status updated",
      data: {
        ...store.toJSON(),
        isOpen: isStoreOpen(store),
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
