const { generateSlotsForNextDays } = require("../services/slot.service");

const initSlots = async () => {
  try {
    console.log("Initializing delivery slots...");

    await generateSlotsForNextDays(7); // 👈 future 7 days

    console.log("Slots initialized ✅");
  } catch (err) {
    console.error("Slot init error:", err.message);
  }
};

module.exports = initSlots;