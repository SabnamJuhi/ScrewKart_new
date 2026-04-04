const MAX_DISTANCE = 8;
const FREE_DELIVERY_THRESHOLD = 999;

function getDeliveryCharge(distanceKm, orderValue) {
  // ❌ Not serviceable
  if (distanceKm > MAX_DISTANCE) {
    return {
      isServiceable: false,
      deliveryCharge: null,
      message: "Out of delivery range",
    };
  }

  // ✅ Orders >= 999
  if (orderValue >= FREE_DELIVERY_THRESHOLD) {
    if (distanceKm <= 6) {
      return {
        isServiceable: true,
        deliveryCharge: 0,
        message: "Free delivery",
      };
    } else {
      return {
        isServiceable: true,
        deliveryCharge: 50,
        message: "Reduced delivery charge applied",
      };
    }
  }

  // ❌ Orders < 999 → slab pricing
  let deliveryCharge = 0;

  if (distanceKm <= 2) deliveryCharge = 40;
  else if (distanceKm <= 4) deliveryCharge = 55;
  else if (distanceKm <= 6) deliveryCharge = 70;
  else deliveryCharge = 100;

  return {
    isServiceable: true,
    deliveryCharge,
    message: "Standard delivery charge applied",
  };
}

module.exports = { getDeliveryCharge };