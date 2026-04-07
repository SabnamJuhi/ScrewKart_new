const router = require("express").Router()
const adminAuth = require("../controllers/admin.auth.controller")
const adminAuthMiddleware = require("../middleware/admin.auth.middleware")
const { allowAdminRoles } = require("../middleware/admin.role.middleware")
const { checkStoreAccess } = require("../middleware/storeAccess.middleware")



router.post("/register", adminAuth.registerAdmin)
router.post("/login", adminAuth.loginAdmin)


// Protected routes (authentication required)
router.get("/profile", adminAuthMiddleware,  allowAdminRoles("superAdmin", "storeAdmin"),  checkStoreAccess, adminAuth.getMyProfile);
router.get("/admin/:id", adminAuthMiddleware,   allowAdminRoles("superAdmin", "storeAdmin"),  checkStoreAccess, adminAuth.getAdminById);
router.put("/admin/:id", adminAuthMiddleware,  allowAdminRoles("superAdmin"), adminAuth.updateAdmin);

// Super Admin only routes
router.get("/super-admins", adminAuthMiddleware,  allowAdminRoles("superAdmin"), adminAuth.getAllSuperAdmins);
router.get("/store-admins", adminAuthMiddleware,  allowAdminRoles("superAdmin"), adminAuth.getAllStoreAdmins);
router.delete("/admin/:id", adminAuthMiddleware,  allowAdminRoles("superAdmin"), adminAuth.deleteAdmin);

module.exports = router
