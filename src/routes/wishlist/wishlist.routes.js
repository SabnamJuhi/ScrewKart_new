const router = require("express").Router();
const ctrl = require("../../controllers/Wishlist/wishlist.controller");
const { protected } = require('../../middleware/user.logout.middleware');

router.post("/", protected, ctrl.addToWishlist);
router.get("/", protected, ctrl.getWishlist);
router.delete("/:id", protected, ctrl.removeFromWishlist);
router.delete("/clear/all", protected, ctrl.clearWishlist);

module.exports = router;