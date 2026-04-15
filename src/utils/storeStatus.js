
// const moment = require("moment");

// exports.isStoreOpen = (store) => {
//   // const now = moment();
//   // const currentTime = now.format("HH:mm");
//   const currentTime = moment()
//   .tz("Asia/Kolkata")
//   .format("HH:mm:ss");

//   // Normalize manual flag
//   const manual =
//     store.isOpenManual === true || store.isOpenManual === "true"
//       ? true
//       : store.isOpenManual === false || store.isOpenManual === "false"
//       ? false
//       : null;

//   // 🔴 FORCE CLOSED (Admin)
//   if (manual === false) {
//     return {
//       isOpen: false,
//       acceptsOrders: false,
//       message: "Store is temporarily closed",
//       status: "MANUALLY_CLOSED",
//     };
//   }

//   // 🟡 Check LAST ORDER cutoff (MOST IMPORTANT)
//   if (currentTime > store.lastOrderTime) {
//     return {
//       isOpen: true, // store visible but not accepting orders
//       acceptsOrders: false,
//       message: `Orders closed for today (last order at ${store.lastOrderTime})`,
//       status: "ORDER_CLOSED",
//     };
//   }

//   // 🟢 FORCE OPEN (Admin override)
//   if (manual === true) {
//     return {
//       isOpen: true,
//       acceptsOrders: true,
//       message: "Store is open",
//       status: "MANUALLY_OPEN",
//     };
//   }

//   // ⏱ Before opening
//   if (currentTime < store.openTime) {
//     return {
//       isOpen: false,
//       acceptsOrders: false,
//       message: `Opens at ${store.openTime}`,
//       status: "NOT_OPEN_YET",
//     };
//   }

//   // 🔴 After closing
//   if (currentTime > store.closeTime) {
//     return {
//       isOpen: false,
//       acceptsOrders: false,
//       message: "Store closed for today",
//       status: "CLOSED",
//     };
//   }

//   // ✅ Normal open
//   return {
//     isOpen: true,
//     acceptsOrders: true,
//     message: "Store is open",
//     status: "OPEN",
//   };
// };




const moment = require("moment");

exports.isStoreOpen = (store) => {
  const currentTime = moment().tz("Asia/Kolkata").format("HH:mm:ss");
  
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

  // Check if store is within operating hours first
  let isWithinHours = false;
  
  // Handle cases where closing time is past midnight
  if (store.closeTime < store.openTime) {
    // Store closes after midnight
    isWithinHours = currentTime >= store.openTime || currentTime <= store.closeTime;
  } else {
    // Normal same-day hours
    isWithinHours = currentTime >= store.openTime && currentTime <= store.closeTime;
  }

  // If not within operating hours, store is closed
  if (!isWithinHours) {
    // Determine appropriate message
    let message = "Store closed for today";
    if (currentTime < store.openTime) {
      message = `Opens at ${store.openTime}`;
    }
    
    return {
      isOpen: false,
      acceptsOrders: false,
      message: message,
      status: currentTime < store.openTime ? "NOT_OPEN_YET" : "CLOSED",
    };
  }

  // 🟡 Check LAST ORDER cutoff (only if within hours)
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

  // ✅ Normal open
  return {
    isOpen: true,
    acceptsOrders: true,
    message: "Store is open",
    status: "OPEN",
  };
};