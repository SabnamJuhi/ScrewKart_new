const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const DeliveryBoy = require("../../models/orders/deliveryBoy.model");
const { Order, OrderAddress } = require("../../models");
const { hashPassword, comparePassword } = require("../../utils/password");
const { generateToken } = require("../../utils/jwt");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

/**
 * REGISTER DELIVERY BOY (Admin or Self)
 */
exports.registerDeliveryBoy = async (req, res) => {
  try {
    const { name, email, mobile, password, confirmPassword, area } = req.body;

    if (!name || !email || !mobile || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await DeliveryBoy.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(409).json({ message: "Delivery boy already exists" });
    }

    // ❌ NO HASHING — store plain password
    const boy = await DeliveryBoy.create({
      name,
      email: normalizedEmail,
      mobile,
      password, // plain text
      area: area || null,
      status: "active",
    });

    res.status(201).json({
      success: true,
      deliveryBoy: {
        id: boy.id,
        name: boy.name,
        email: boy.email,
        mobile: boy.mobile,
        area: boy.area,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginDeliveryBoy = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ FIX: search by email column, NOT normalizedEmail
    const boy = await DeliveryBoy.findOne({
      where: { email: normalizedEmail },
    });

    if (!boy) throw new Error("Invalid credentials");

    // ❌ NO bcrypt — simple comparison
    if (boy.password !== password) {
      throw new Error("Invalid credentials");
    }

    if (boy.status !== "active") {
      throw new Error("Delivery boy account inactive");
    }

    const token = generateToken(boy.id);

    res.json({
      success: true,
      token,
      deliveryBoy: {
        id: boy.id,
        name: boy.name,
        email: boy.email,
        area: boy.area,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllDeliveryBoys = async (req, res) => {
  try {
    const paginationOptions = getPaginationOptions(req.query);
    const boys = await DeliveryBoy.findAndCountAll({
      attributes: { exclude: ["password"] }, // hide password
      order: [["createdAt", "DESC"]],
      distinct: true,
      ...paginationOptions,
    });
    const response = formatPagination(
      {
        count: boys.count,
        rows: boys.rows,
      },
      paginationOptions.currentPage,
      paginationOptions.limit,
    );

    return res.json({
      success: true,
      ...response,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, password, area, status } = req.body;

    // 🔍 Find delivery boy
    const boy = await DeliveryBoy.findByPk(id);
    if (!boy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    // 📧 Normalize email if provided
    let normalizedEmail = boy.email;
    if (email) {
      normalizedEmail = email.toLowerCase().trim();

      const emailExists = await DeliveryBoy.findOne({
        where: { email: normalizedEmail },
      });

      if (emailExists && emailExists.id !== boy.id) {
        return res.status(409).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    // 📱 Check mobile uniqueness if provided
    if (mobile) {
      const mobileExists = await DeliveryBoy.findOne({
        where: { mobile },
      });

      if (mobileExists && mobileExists.id !== boy.id) {
        return res.status(409).json({
          success: false,
          message: "Mobile number already in use",
        });
      }
    }

    // ✏️ Update fields (partial update allowed)
    await boy.update({
      name: name ?? boy.name,
      email: normalizedEmail,
      mobile: mobile ?? boy.mobile,
      password: password ?? boy.password, // plain text as per your requirement
      area: area ?? boy.area,
      status: status ?? boy.status,
    });

    // 🚫 Hide password from response
    const updated = boy.toJSON();
    delete updated.password;

    res.json({
      success: true,
      message: "Delivery boy updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update DeliveryBoy Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
      error: err.errors || null, // shows Sequelize validation reason
    });
  }
};

exports.deleteDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;

    const boy = await DeliveryBoy.findByPk(id);
    if (!boy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    await boy.destroy();

    res.json({
      success: true,
      message: "Delivery boy deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// /**
//  * Get assigned orders for delivery boy with all OTP information
//  */
// exports.getMyAssignedOrders = async (req, res) => {
//   try {
//     const paginationOptions = getPaginationOptions(req.query);
//     const deliveryBoyId = req.deliveryBoy.id;
    
//     const orders = await Order.findAndCountAll({
//       where: {
//         deliveryBoyId: deliveryBoyId,
//         status: ["dispatched", "out_for_delivery"],
//       },
//       include: [
//         {
//           model: OrderAddress,
//           as: "address",
//           attributes: [
//             "fullName",
//             "phoneNumber",
//             "addressLine",
//             "city",
//             "state",
//             "zipCode",
//             "country",
//             "latitude",
//             "longitude",
//             "placeId",
//             "formattedAddress",
//           ],
//         },
//         {
//           model: Store,
//           as: "store",
//           attributes: [
//             "id",
//             "name",
//             "latitude",
//             "longitude",
//             "address",
//             "phoneNumber",
//             "openTime",
//             "closeTime"
//           ],
//         },
//         {
//           model: OrderItem,
//           as: "OrderItems",
//           attributes: ["productName", "quantity", "totalPrice"]
//         }
//       ],
//       order: [["deliveryDate", "ASC"], ["createdAt", "DESC"]],
//       distinct: true,
//       ...paginationOptions,
//     });
    
//     // Transform orders to include both OTPs
//     const ordersWithDetails = orders.rows.map((order) => {
//       const orderJson = order.toJSON();
//       const address = orderJson.address;
//       const store = orderJson.store;

//       // Generate customer address navigation links
//       if (address) {
//         if (address.latitude && address.longitude) {
//           address.navigationLinks = {
//             googleMaps: `https://www.google.com/maps?q=${address.latitude},${address.longitude}`,
//             directions: `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`,
//             waze: `https://waze.com/ul?ll=${address.latitude},${address.longitude}&navigate=yes`,
//           };
//         } else if (address.formattedAddress) {
//           const encodedAddress = encodeURIComponent(address.formattedAddress);
//           address.navigationLinks = {
//             googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
//             directions: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
//           };
//         }
//       }

//       // Generate store location links for dispatched orders
//       let storeLocation = null;
//       if (order.status === "dispatched" && store && store.latitude && store.longitude) {
//         storeLocation = {
//           name: store.name,
//           address: store.address,
//           phoneNumber: store.phoneNumber,
//           coordinates: {
//             lat: store.latitude,
//             lng: store.longitude
//           },
//           navigationLinks: {
//             googleMaps: `https://www.google.com/maps?q=${store.latitude},${store.longitude}`,
//             directions: `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`,
//             waze: `https://waze.com/ul?ll=${store.latitude},${store.longitude}&navigate=yes`,
//           }
//         };
//       }

//       // ✅ Include BOTH OTPs in the response
//       return {
//         orderNumber: order.orderNumber,
//         status: order.status,
//         deliveryDate: order.deliveryDate,
//         deliverySlot: order.deliverySlotId,
//         totalAmount: order.totalAmount,
//         paymentMethod: order.paymentMethod,
        
//         // ✅ ALL OTPs for this order
//         otpInfo: {
//           // OTP for store pickup (already verified for out_for_delivery orders)
//           deliveryPickupOtp: order.deliveryPickupOtp,
//           deliveryPickupOtpVerified: order.deliveryPickupOtpVerified === 1,
          
//           // OTP for customer delivery (current active OTP)
//           customerDeliveryOtp: order.otp,
//           customerDeliveryOtpVerified: order.otpVerified === 1,
          
//           // Pickup order OTP (if applicable)
//           pickupOtp: order.pickupOtp,
//           pickupOtpVerified: order.pickupOtpVerified === 1,
          
//           // Which OTP is currently needed
//           currentRequiredOtp: order.status === "dispatched" ? order.deliveryPickupOtp : order.otp,
//           currentStep: order.status === "dispatched" ? "STORE_PICKUP" : "CUSTOMER_DELIVERY",
//         },
        
//         // Store location (only for dispatched orders)
//         storeLocation: storeLocation,
        
//         // Customer address
//         address: address,
        
//         // Order items
//         items: order.OrderItems,
        
//         // Timeline
//         timeline: {
//           dispatchedAt: order.dispatchedAt,
//           outForDeliveryAt: order.outForDeliveryAt,
//           deliveredAt: order.deliveredAt
//         }
//       };
//     });
    
//     // Get summary statistics
//     const summary = {
//       totalAssigned: orders.count,
//       outForDelivery: orders.rows.filter(o => o.status === "out_for_delivery").length,
//       dispatched: orders.rows.filter(o => o.status === "dispatched").length,
//       todaysDeliveries: orders.rows.filter(o => o.deliveryDate === new Date().toISOString().split('T')[0]).length
//     };
    
//     const response = formatPagination(
//       {
//         count: orders.count,
//         rows: ordersWithDetails,
//       },
//       paginationOptions.currentPage,
//       paginationOptions.limit,
//     );

//     return res.json({
//       success: true,
//       summary: summary,
//       ...response,
//     });
    
//   } catch (err) {
//     console.error("Get my assigned orders error:", err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// exports.verifyDeliveryOtp = async (req, res) => {
//   try {
//     const { orderNumber, otp } = req.body;

//     if (!orderNumber || !otp) {
//       throw new Error("orderNumber and otp required");
//     }

//     const order = await Order.findOne({ where: { orderNumber } });
//     if (!order) throw new Error("Order not found");

//     // must belong to this delivery boy
//     if (order.deliveryBoyId !== req.deliveryBoy.id) {
//       throw new Error("Not authorized for this order");
//     }

//     if (order.status !== "out_for_delivery") {
//       throw new Error("Order not in deliverable state");
//     }

//     // Simple OTP check
//     if (order.otp !== otp) {
//       throw new Error("Invalid OTP");
//     }

//     const updateData = {
//       otpVerified: true,
//       otp: null, // remove OTP after successful verification
//       deliveredAt: new Date(),
//     };

//     // Update status based on payment method
//     if (order.paymentMethod === "COD") {
//       updateData.status = "completed"; // COD: mark delivered
//       updateData.completedAt = new Date();
//       updateData.paymentStatus = "paid";
//     } else {
//       updateData.status = "completed"; // Online: mark completed
//       updateData.completedAt = new Date();
//       updateData.paymentStatus = "paid";
//     }

//     await order.update(updateData);

//     res.json({
//       success: true,
//       message:
//         order.paymentMethod === "COD"
//           ? "Delivered. Collect cash & confirm payment."
//           : "Order completed successfully.",
//     });
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

// exports.confirmCodPayment = async (req, res) => {
//   try {
//     const { orderNumber } = req.body;

//     const order = await Order.findOne({ where: { orderNumber } });
//     if (!order) throw new Error("Order not found");

//     if (order.deliveryBoyId !== req.deliveryBoy.id) {
//       throw new Error("Not authorized");
//     }

//     if (order.paymentMethod !== "COD") {
//       throw new Error("Not a COD order");
//     }

//     if (order.status !== "delivered") {
//       throw new Error("Order not delivered yet");
//     }

//     await order.update({
//       status: "completed",
//       paymentStatus: "paid",
//       completedAt: new Date(),
//     });

//     res.json({
//       success: true,
//       message: "COD payment confirmed. Order completed.",
//     });
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };
