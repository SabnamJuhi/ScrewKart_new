// routes/store.routes.js

const express = require("express");
const router = express.Router();

const {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
  toggleStoreStatus,
} = require("../../controllers/store/store.controller");
const { getNearestStore } = require("../../controllers/store/getNearestStore.controller");
// const { getNearbyStores } = require("../../controllers/store/getNearbyStores.controller");
const { getProductsByStore } = require("../../controllers/store/getProductsByStore.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");
const {createStoreInventory, updateStock} = require("../../controllers/store/storeInventory.controller")



// CRUD
router.post("/", adminAuthMiddleware, createStore);
router.get("/", getAllStores);
router.get("/:id", getStoreById);
router.put("/:id", adminAuthMiddleware, updateStore);
router.delete("/:id", adminAuthMiddleware, deleteStore);

// Extra
router.patch("/:id/toggle", adminAuthMiddleware, toggleStoreStatus);

// Geo + product
// router.get("/nearby/list", getNearbyStores);
router.get("/nearest/list", getNearestStore);
router.get("/:storeId/products", getProductsByStore);
router.post("/storeInventory", adminAuthMiddleware, createStoreInventory)
router.patch("/storeInventory", adminAuthMiddleware, updateStock)

module.exports = router;