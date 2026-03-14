// services/pricing/pricingEngine.js
exports.applyOffers = ({ basePrice, offers }) => {
  let finalPrice = basePrice
  let appliedOffer = null

  for (const offer of offers) {
    for (const sub of offer.OfferSubs) {
      if (sub.discountType === "FLAT") {
        finalPrice = basePrice - sub.discountValue
        appliedOffer = sub
        break
      }

      if (sub.discountType === "PERCENTAGE") {
        const discount = (basePrice * sub.discountValue) / 100
        finalPrice = basePrice - Math.min(discount, sub.maxDiscount || discount)
        appliedOffer = sub
        break
      }
    }
  }

  return {
    finalPrice: Math.max(finalPrice, 0),
    appliedOffer,
    availableOffers: offers
  }
}
