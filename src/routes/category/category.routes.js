const router = require("express").Router()
const adminAuth = require("../../middleware/admin.auth.middleware")
const controller = require("../../controllers/category/category.controller")


// Category routes
router.post("/", adminAuth, controller.createCategory)
router.get("/nested", controller.getAllNestedCategories)
// router.get("/", controller.getAllCategories)
router.get("/:id", controller.getCategoryById)
router.put("/:id", adminAuth, controller.updateCategory)
router.delete("/:id", adminAuth, controller.deleteCategory)



module.exports = router
