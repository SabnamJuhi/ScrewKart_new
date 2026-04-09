const { createMeasurement, getMeasurements, updateMeasurement, deleteMeasurement } = require("../../controllers/measurementUnitMaster/measurementMaster.controller");
const { createUnit, getUnits, updateUnit, deleteUnit } = require("../../controllers/measurementUnitMaster/unitMaster.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");
const { allowAdminRoles } = require("../../middleware/admin.role.middleware");


const router = require("express").Router()

// Measurement
router.post("/measurement", adminAuthMiddleware, allowAdminRoles("superAdmin"), createMeasurement);
router.get("/measurement", adminAuthMiddleware, allowAdminRoles("superAdmin"), getMeasurements);
router.put("/measurement/:id", adminAuthMiddleware, allowAdminRoles("superAdmin"), updateMeasurement);
router.delete("/measurement/:id", adminAuthMiddleware, allowAdminRoles("superAdmin"), deleteMeasurement);

// Unit
router.post("/unit", adminAuthMiddleware, allowAdminRoles("superAdmin"), createUnit);
router.get("/unit", adminAuthMiddleware, allowAdminRoles("superAdmin"), getUnits);
router.put("/unit/:id", adminAuthMiddleware, allowAdminRoles("superAdmin"), updateUnit);
router.delete("/unit/:id", adminAuthMiddleware, allowAdminRoles("superAdmin"), deleteUnit);

module.exports = router