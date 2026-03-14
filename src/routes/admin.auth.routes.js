const router = require("express").Router()
const adminAuth = require("../controllers/admin.auth.controller")
const adminMiddleware = require("../middleware/admin.auth.middleware")

//
router.post("/register", adminAuth.registerAdmin)
router.post("/login", adminAuth.loginAdmin)

// Protected test route
router.get("/profile", adminMiddleware, (req, res) => {
  res.json({
    message: "Admin authenticated",
    admin: req.admin
  })
})

module.exports = router
