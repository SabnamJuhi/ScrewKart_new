// const { Store } = require("../../models");
// const { getDistanceKm } = require("../../utils/distance");
// const { isStoreOpen } = require("../../utils/storeStatus");


// exports.getNearestStore = async (req, res) => {
//   try {
//     let { latitude, longitude } = req.query;

//     const lat = parseFloat(latitude);
//     const lng = parseFloat(longitude);

//     if (isNaN(lat) || isNaN(lng)) {
//       throw new Error("Valid latitude and longitude required");
//     }

//     const stores = await Store.findAll({
//       where: { isActive: true },
//     });

//     let availableStores = [];

//     for (let store of stores) {
//       const distance = getDistanceKm(lat, lng, store.latitude, store.longitude);

//       if (distance > store.deliveryRadius) continue;

//       const status = isStoreOpen(store);

//       availableStores.push({
//         ...store.toJSON(),
//         distance,
//         isOpen: status.isOpen,
//         statusMessage: status.message,
//       });
//     }

//     if (!availableStores.length) {
//       return res.json({
//         success: false,
//         message: "We are expanding to your location",
//       });
//     }

//     // ✅ Sort (Blinkit priority)
//     availableStores.sort((a, b) => {
//       if (a.isOpen !== b.isOpen) return b.isOpen - a.isOpen;
//       if (a.avgDeliveryTime !== b.avgDeliveryTime)
//         return a.avgDeliveryTime - b.avgDeliveryTime;
//       return a.distance - b.distance;
//     });

//     // ✅ Pick best + alternatives
//     const bestStore = availableStores[0];
//     const alternatives = availableStores.slice(1, 4); // top 3 alternatives

//     res.json({
//       success: true,
//       data: {
//         bestStore,
//         alternatives,
//       },
//     });
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };



const { Store } = require("../../models");
const { getDistanceKm } = require("../../utils/distance");
const { isStoreOpen } = require("../../utils/storeStatus");

exports.getNearestStore = async (req, res) => {
  try {
    let { latitude, longitude } = req.query;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error("Valid latitude and longitude required");
    }

    // Get all active stores (no distance filtering)
    const stores = await Store.findAll({
      where: { isActive: true },
    });

    if (!stores.length) {
      return res.json({
        success: false,
        message: "No stores available at the moment",
      });
    }

    // Calculate distance for all stores
    let storesWithDetails = [];

    for (let store of stores) {
      const distance = getDistanceKm(lat, lng, store.latitude, store.longitude);
      const status = isStoreOpen(store);
      
      // Check if delivery is available (within 8km)
      const deliveryRadius = store.deliveryRadius || 8;
      const isDeliveryAvailable = distance <= deliveryRadius;

      storesWithDetails.push({
        ...store.toJSON(),
        distance,
        isOpen: status.isOpen,
        acceptsOrders: status.acceptsOrders,
        statusMessage: status.message,
        isDeliveryAvailable: isDeliveryAvailable,
        isSelfPickupAvailable: true, // Always available
        availableOptions: isDeliveryAvailable ? ['delivery', 'pickup'] : ['pickup'],
        customerMessage: isDeliveryAvailable 
          ? `✅ Delivery available to your location (${distance.toFixed(2)}km)`
          : `📍 Self-pickup only (${distance.toFixed(2)}km > ${deliveryRadius}km delivery limit)`,
      });
    }

    // Sort by distance (nearest first)
    storesWithDetails.sort((a, b) => a.distance - b.distance);

    // Get nearest store
    const nearestStore = storesWithDetails[0];
    const alternatives = storesWithDetails.slice(1, 4);

    // Prepare response message
    let responseMessage = "";
    if (!nearestStore.isDeliveryAvailable) {
      responseMessage = `Your nearest store is ${nearestStore.distance.toFixed(2)}km away. Delivery is not available beyond ${8}km. Please choose self-pickup.`;
    } else if (!nearestStore.isOpen) {
      responseMessage = nearestStore.statusMessage;
    } else {
      responseMessage = `Store is ${nearestStore.distance.toFixed(2)}km away. Delivery available!`;
    }

    res.json({
      success: true,
      data: {
        nearestStore,
        alternatives: alternatives,
        message: responseMessage,
      },
    });
  } catch (err) {
    console.error("Get nearest store error:", err);
    res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
};