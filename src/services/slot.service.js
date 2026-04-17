const { DeliverySlot } = require("../models");

const SLOT_TIMINGS = [
  ["09:00", "10:00"],
  ["10:00", "11:00"],
  ["11:00", "12:00"],
  ["12:00", "13:00"],
  ["13:00", "14:00"],
  ["14:00", "15:00"],
  ["15:00", "16:00"],
  ["16:00", "17:00"],
  ["17:00", "18:00"],
  ["18:00", "19:00"],
  ["19:00", "20:00"],
];


// // ✅ 1. Get Available Slots (THIS WAS MISSING 🔥)
// const getAvailableSlots = async (date) => {
//   const now = new Date();

//   // 30 min buffer
//   const bufferTime = new Date(now.getTime() + 30 * 60000);

//   const slots = await DeliverySlot.findAll({
//     where: {
//       date,
//       status: "available",
//     },
//     order: [["startTime", "ASC"]],
//   });

//   return slots.filter((slot) => {
//     const slotStart = new Date(`${slot.date}T${slot.startTime}`);

//     // ❌ remove past slots
//     if (slotStart <= now) return false;

//     // ❌ enforce 30 min buffer
//     if (slotStart <= bufferTime) return false;

//     // ❌ remove full slots
//     if (slot.currentOrders >= slot.maxCapacity) return false;

//     return true;
//   });
// };



// In slot.service.js
const getAvailableSlots = async (date) => {
  const now = new Date(); 
  // ✅ Convert to IST
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const bufferTime = new Date(now.getTime() + 30 * 60000);
  const currentTimeStr = now.toTimeString().slice(0, 5);
  
  const slots = await DeliverySlot.findAll({
    where: {
      date,
      status: "available"
    },
    order: [["startTime", "ASC"]]
  });
  
  return slots.filter((slot) => {
    // const slotStart = new Date(`${date}T${slot.startTime}`);
    const slotStart = new Date(`${date}T${slot.startTime}+05:30`);
    
    // Remove past slots
    if (slotStart <= now) return false;
    
    // Enforce 30 min buffer
    if (slotStart <= bufferTime) return false;
    
    // Remove full slots
    if (slot.currentOrders >= slot.maxCapacity) return false;
    
    return true;
  });
};


// ✅ 2. Generate slots for a single date
const generateSlotsForDate = async (date) => {
  const slotData = SLOT_TIMINGS.map(([start, end]) => ({
    date,
    startTime: start,
    endTime: end,
    maxCapacity: 3,
    currentOrders: 0,
    status: "available",
  }));

  await DeliverySlot.bulkCreate(slotData, {
    ignoreDuplicates: true, // 🔥 prevents duplicates
  });
};


// ✅ 3. Generate slots for multiple days
const generateSlotsForNextDays = async (days = 7) => {
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const formatted = date.toISOString().split("T")[0];

    await generateSlotsForDate(formatted);
  }
};


// ✅ EXPORT ALL FUNCTIONS
module.exports = {
  getAvailableSlots,           // 🔥 REQUIRED
  generateSlotsForDate,
  generateSlotsForNextDays,
};