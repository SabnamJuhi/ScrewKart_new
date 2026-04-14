// const MAX_DISTANCE = 8;
// const FREE_DELIVERY_THRESHOLD = 999;

// function getDeliveryCharge(distanceKm, orderValue) {
//   // ❌ Not serviceable
//   if (distanceKm > MAX_DISTANCE) {
//     return {
//       isServiceable: false,
//       deliveryCharge: null,
//       message: "Out of delivery range",
//     };
//   }

//   // ✅ Orders >= 999
//   if (orderValue >= FREE_DELIVERY_THRESHOLD) {
//     if (distanceKm <= 6) {
//       return {
//         isServiceable: true,
//         deliveryCharge: 0,
//         message: "Free delivery",
//       };
//     } else {
//       return {
//         isServiceable: true,
//         deliveryCharge: 50,
//         message: "Reduced delivery charge applied",
//       };
//     }
//   }

//   // ❌ Orders < 999 → slab pricing
//   let deliveryCharge = 0;

//   if (distanceKm <= 2) deliveryCharge = 40;
//   else if (distanceKm <= 4) deliveryCharge = 55;
//   else if (distanceKm <= 6) deliveryCharge = 70;
//   else deliveryCharge = 100;

//   return {
//     isServiceable: true,
//     deliveryCharge,
//     message: "Standard delivery charge applied",
//   };
// }

// module.exports = { getDeliveryCharge };






const MAX_DELIVERY_DISTANCE = 8;
const FREE_DELIVERY_THRESHOLD = 999;

function getDeliveryCharge(distanceKm, orderValue, deliveryType = 'delivery') {
  // ✅ For self-pickup, always free
  if (deliveryType === 'pickup') {
    return {
      isServiceable: true,
      deliveryCharge: 0,
      message: "Self-pickup (no delivery charge)",
      deliveryType: 'pickup'
    };
  }

  // ❌ Delivery not serviceable beyond 8km
  if (distanceKm > MAX_DELIVERY_DISTANCE) {
    return {
      isServiceable: false,
      deliveryCharge: null,
      message: `Delivery not available beyond ${MAX_DELIVERY_DISTANCE}km. Please choose self-pickup.`,
      deliveryType: 'delivery'
    };
  }

  // ✅ Orders >= ₹999
  if (orderValue >= FREE_DELIVERY_THRESHOLD) {
    if (distanceKm <= 6) {
      return {
        isServiceable: true,
        deliveryCharge: 0,
        message: "Free delivery (order value ≥ ₹999)",
        deliveryType: 'delivery'
      };
    } else {
      return {
        isServiceable: true,
        deliveryCharge: 50,
        message: "Reduced delivery charge of ₹50 applied",
        deliveryType: 'delivery'
      };
    }
  }

  // ❌ Orders < ₹999 → slab pricing
  let deliveryCharge = 0;
  let slabMessage = "";

  if (distanceKm <= 2) {
    deliveryCharge = 40;
    slabMessage = "Delivery charge: ₹40 (0-2km)";
  } else if (distanceKm <= 4) {
    deliveryCharge = 55;
    slabMessage = "Delivery charge: ₹55 (2-4km)";
  } else if (distanceKm <= 6) {
    deliveryCharge = 70;
    slabMessage = "Delivery charge: ₹70 (4-6km)";
  } else {
    deliveryCharge = 100;
    slabMessage = "Delivery charge: ₹100 (6-8km)";
  }

  return {
    isServiceable: true,
    deliveryCharge,
    message: slabMessage,
    deliveryType: 'delivery'
  };
}

module.exports = { getDeliveryCharge };