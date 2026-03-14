const router = require("express").Router();
const cartCtrl = require("../../controllers/order/cart.controller");
const { protect } = require("../../middleware/user.auth.middleware");
const {protected} = require("../../middleware/user.logout.middleware")

router.use(protected); // All cart actions require a logged-in user

router.get("/", cartCtrl.getCart);
router.post("/add", cartCtrl.addToCart);
router.post("/merge", cartCtrl.mergeGuestCart);
router.post("/decrease", cartCtrl.decreaseQuantity);
router.delete("/item",  cartCtrl.deleteCartItem)

module.exports = router;