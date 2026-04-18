


const slotService = require("../../services/slot.service");
const { DeliverySlot, Store } = require("../../models"); // ✅ Add this import
const { getDistanceKm } = require("../../utils/distance");

exports.getSlots = async (req, res) => {
  try {
    const { date } = req.query;
    
    // ✅ Validate date parameter
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }
    
    // ✅ Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD"
      });
    }
    
    const slots = await slotService.getAvailableSlots(date);

    if (!slots.length) {
      return res.json({
        success: true,  // ✅ Changed to true - no slots is still a valid response
        message: "No slots available for this date",
        data: []
      });
    }

    // ✅ Format slots for better frontend consumption
    const formattedSlots = slots.map(slot => ({
      id: slot.id,
      date: slot.date,
      startTime: slot.startTime.substring(0, 5), // "12:00:00" -> "12:00"
      endTime: slot.endTime.substring(0, 5),     // "13:00:00" -> "13:00"
      maxCapacity: slot.maxCapacity,
      currentOrders: slot.currentOrders,
      remainingCapacity: slot.maxCapacity - slot.currentOrders,
      status: slot.status,
      isAvailable: slot.currentOrders < slot.maxCapacity
    }));

    res.json({
      success: true,
      data: formattedSlots,
      totalAvailable: formattedSlots.length
    });
    
  } catch (err) {
    console.error("Get slots error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Get all slots for a date (without availability filters - for admin/debugging)
exports.getAllSlotsForDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }
    
    // ✅ Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD"
      });
    }
    
    const slots = await DeliverySlot.findAll({
      where: { date },
      order: [["startTime", "ASC"]]
    });
    
    // ✅ Format slots for consistency
    const formattedSlots = slots.map(slot => ({
      id: slot.id,
      date: slot.date,
      startTime: slot.startTime.substring(0, 5),
      endTime: slot.endTime.substring(0, 5),
      maxCapacity: slot.maxCapacity,
      currentOrders: slot.currentOrders,
      remainingCapacity: slot.maxCapacity - slot.currentOrders,
      status: slot.status,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt
    }));
    
    return res.json({
      success: true,
      totalSlots: slots.length,
      data: formattedSlots
    });
    
  } catch (error) {
    console.error("Get all slots error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get customer available slots with location check
exports.getCustomerAvailableSlots = async (req, res) => {
  try {
    const { date, latitude, longitude } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Location coordinates are required"
      });
    }
    
    // Get store
    const store = await Store.findOne({
      where: { id: 210001 } // Use the actual store ID from your data
    });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    
    // ✅ IMPORTANT: Parse coordinates as floats
    const customerLat = parseFloat(latitude);
    const customerLng = parseFloat(longitude);
    const storeLat = parseFloat(store.latitude);
    const storeLng = parseFloat(store.longitude);
    
    console.log("Customer coordinates:", { lat: customerLat, lng: customerLng });
    console.log("Store coordinates:", { lat: storeLat, lng: storeLng });
    
    // Calculate distance
    const distance = getDistanceKm(customerLat, customerLng, storeLat, storeLng);
    
    console.log(`Calculated distance: ${distance.toFixed(2)}km`);
    
    // Check if within serviceable radius (8km as per your requirement)
    const MAX_DELIVERY_DISTANCE = 8; // Changed from 10 to 8 as per your spec
    
    if (distance > MAX_DELIVERY_DISTANCE) {
      return res.json({
        success: true,
        isServiceable: false,
        message: `Delivery not available at this location. Distance: ${distance.toFixed(2)}km. Maximum allowed: ${MAX_DELIVERY_DISTANCE}km`,
        selfPickupAvailable: true,
        distanceKm: distance.toFixed(2),
        slots: []
      });
    }
    
    // Get available slots
    const slots = await slotService.getAvailableSlots(date);
    
    // Format slots
    const formattedSlots = slots.map(slot => ({
      id: slot.id,
      startTime: slot.startTime.substring(0, 5),
      endTime: slot.endTime.substring(0, 5),
      remainingCapacity: slot.maxCapacity - slot.currentOrders,
      currentOrders: slot.currentOrders,
      maxCapacity: slot.maxCapacity
    }));
    
    res.json({
      success: true,
      isServiceable: true,
      distanceKm: distance.toFixed(2),
      date: date,
      slots: formattedSlots,
      selfPickupAvailable: true,
      message: formattedSlots.length ? `${formattedSlots.length} slots available` : "No slots available"
    });
    
  } catch (error) {
    console.error("Get customer slots error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};