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
const {
  getNearestStore,
} = require("../../controllers/store/getNearestStore.controller");
// const { getNearbyStores } = require("../../controllers/store/getNearbyStores.controller");
const {
  getProductsByStore,
} = require("../../controllers/store/getProductsByStore.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");
const {
  createStoreInventory,
  updateStock,
  getStoreInventory,
  getProductStock,
  getVariantStock,
} = require("../../controllers/store/storeInventory.controller");
const { allowAdminRoles } = require("../../middleware/admin.role.middleware");
const { checkStoreAccess } = require("../../middleware/storeAccess.middleware");

// CRUD
router.post(
  "/",
  adminAuthMiddleware,
  allowAdminRoles("superAdmin"),
  createStore,
);
router.get("/", getAllStores);
router.get("/:id", getStoreById);
router.put(
  "/:id",
  adminAuthMiddleware,
  allowAdminRoles("superAdmin", "storeAdmin"),
  checkStoreAccess,
  updateStore,
);
router.delete(
  "/:id",
  adminAuthMiddleware,
  allowAdminRoles("superAdmin"),
  deleteStore,
);

// Extra
router.patch(
  "/:id/toggle",
  adminAuthMiddleware,
  allowAdminRoles("superAdmin", "storeAdmin"),
  checkStoreAccess,
  toggleStoreStatus,
);

// Geo + product
// router.get("/nearby/list", getNearbyStores);
router.get("/nearest/list", getNearestStore);
router.get("/:storeId/products", getProductsByStore);
router.post(
  "/storeInventory",
  adminAuthMiddleware,
  allowAdminRoles("superAdmin", "storeAdmin"),
  checkStoreAccess,
  createStoreInventory,
);
// router.patch("/storeInventory", adminAuthMiddleware, updateStock)
router.get("/:storeId/inventory", getStoreInventory);
router.get("/:storeId/product/:productId", getProductStock);
router.get("/:variantId/stock", getVariantStock);

module.exports = router;
