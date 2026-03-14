const router = require("express").Router()
const offerCtrl = require("../../controllers/offers/offer.controller")

router.post("/", offerCtrl.createOffer)
router.get("/", offerCtrl.getAllOffers)
router.get("/:id", offerCtrl.getOffer)
router.patch("/:id", offerCtrl.updateOffer)
router.delete("/:id", offerCtrl.deactivateOffer)

module.exports = router
