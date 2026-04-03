// exports.isStoreOpen = (store) => {
//   if (!store.isActive) return false;

//   // Manual override
//   if (store.isOpenManual === true) return true;
//   if (store.isOpenManual === false) return false;

//   if (!store.openTime || !store.lastOrderTime) return false;

//   const now = new Date();
//   const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

//   // ✅ Handle normal + overnight stores
//   if (store.openTime < store.lastOrderTime) {
//     // same day (08:00 → 22:00)
//     return currentTime >= store.openTime && currentTime <= store.lastOrderTime;
//   } else {
//     // overnight (20:00 → 02:00)
//     return (
//       currentTime >= store.openTime ||
//       currentTime <= store.lastOrderTime
//     );
//   }
// };



// const moment = require("moment");

// exports.isStoreOpen = (store) => {
//   const now = moment();
//   const currentTime = now.format("HH:mm");

//   // 🔁 Manual override (highest priority)
//   if (store.isOpenManual === false) {
//     return {
//       isOpen: false,
//       message: "Store is temporarily closed by admin",
//     };
//   }

//   if (store.isOpenManual === true) {
//     return {
//       isOpen: true,
//       message: "Store is open",
//     };
//   }

//   // ⏱ Normal timing logic
//   if (currentTime < store.openTime) {
//     return {
//       isOpen: false,
//       message: `Store opens at ${store.openTime}`,
//     };
//   }

//   if (currentTime > store.closeTime) {
//     return {
//       isOpen: false,
//       message: "Store is closed for today",
//     };
//   }

//   // ⚡ Last order cutoff (Blinkit logic)
//   if (currentTime > store.lastOrderTime) {
//     return {
//       isOpen: false,
//       message: `Orders closed for today (last order at ${store.lastOrderTime})`,
//     };
//   }

//   return {
//     isOpen: true,
//     message: "Store is open",
//   };
// };



const moment = require("moment");

exports.isStoreOpen = (store) => {
  // const now = moment();
  // const currentTime = now.format("HH:mm");
  const currentTime = moment()
  .tz("Asia/Kolkata")
  .format("HH:mm:ss");

  // Normalize manual flag
  const manual =
    store.isOpenManual === true || store.isOpenManual === "true"
      ? true
      : store.isOpenManual === false || store.isOpenManual === "false"
      ? false
      : null;

  // 🔴 FORCE CLOSED (Admin)
  if (manual === false) {
    return {
      isOpen: false,
      acceptsOrders: false,
      message: "Store is temporarily closed",
      status: "MANUALLY_CLOSED",
    };
  }

  // 🟡 Check LAST ORDER cutoff (MOST IMPORTANT)
  if (currentTime > store.lastOrderTime) {
    return {
      isOpen: true, // store visible but not accepting orders
      acceptsOrders: false,
      message: `Orders closed for today (last order at ${store.lastOrderTime})`,
      status: "ORDER_CLOSED",
    };
  }

  // 🟢 FORCE OPEN (Admin override)
  if (manual === true) {
    return {
      isOpen: true,
      acceptsOrders: true,
      message: "Store is open",
      status: "MANUALLY_OPEN",
    };
  }

  // ⏱ Before opening
  if (currentTime < store.openTime) {
    return {
      isOpen: false,
      acceptsOrders: false,
      message: `Opens at ${store.openTime}`,
      status: "NOT_OPEN_YET",
    };
  }

  // 🔴 After closing
  if (currentTime > store.closeTime) {
    return {
      isOpen: false,
      acceptsOrders: false,
      message: "Store closed for today",
      status: "CLOSED",
    };
  }

  // ✅ Normal open
  return {
    isOpen: true,
    acceptsOrders: true,
    message: "Store is open",
    status: "OPEN",
  };
};