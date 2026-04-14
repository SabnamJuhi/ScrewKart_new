// // scripts/seedSlots.js
// const { generateSlotsForDate } = require("../services/slot.service");

// (async () => {
//   const today = new Date().toISOString().split("T")[0];
//   await generateSlotsForDate(today);

//   console.log("Slots seeded");
//   // process.exit();
// })();



const { generateSlotsForNextDays } = require("../services/slot.service");

const initSlots = async () => {
  try {
    console.log("Initializing delivery slots...");

    await generateSlotsForNextDays(7);

    console.log("Slots initialized ✅");
  } catch (err) {
    console.error("Slot init error:", err.message);
  }
};

module.exports = initSlots;