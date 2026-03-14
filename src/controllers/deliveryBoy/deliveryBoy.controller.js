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

exports.getMyAssignedOrders = async (req, res) => {
  try {
    const paginationOptions = getPaginationOptions(req.query);
    const orders = await Order.findAndCountAll({
      where: {
        deliveryBoyId: req.deliveryBoy.id,
        status: "out_for_delivery",
      },
      include: [
        {
          model: OrderAddress,
          as: "address",
          attributes: [
            "fullName",
            "phoneNumber",
            "addressLine",
            "city",
            "state",
            "zipCode",
            "country",
            "latitude",
            "longitude",
            "placeId",
            "formattedAddress",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      distinct: true,
      ...paginationOptions,
    });
    // Transform orders to include navigation links
    const ordersWithLinks = orders.rows.map((order) => {
      const orderJson = order.toJSON();
      const address = orderJson.address;

      if (address) {
        // Generate Google Maps links based on available data
        if (address.latitude && address.longitude) {
          // Exact coordinates available - best for navigation
          address.navigationLinks = {
            googleMaps: `https://www.google.com/maps?q=${address.latitude},${address.longitude}`,
            googleMapsDirections: `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`,
            waze: `https://waze.com/ul?ll=${address.latitude},${address.longitude}&navigate=yes`,
            appleMaps: `https://maps.apple.com/?ll=${address.latitude},${address.longitude}&q=${encodeURIComponent(address.formattedAddress || "Delivery Location")}`,
            uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${address.latitude}&dropoff[longitude]=${address.longitude}&dropoff[nickname]=${encodeURIComponent(address.formattedAddress || "Delivery")}`,
          };
          // Also add a simple clickable link
          address.googleMapsLink = `https://www.google.com/maps?q=${address.latitude},${address.longitude}`;
        } else if (address.placeId) {
          // Has Google Place ID - can use place-based link
          address.navigationLinks = {
            googleMaps: `https://www.google.com/maps/place/?q=place_id:${address.placeId}`,
            googleMapsDirections: `https://www.google.com/maps/dir/?api=1&destination_place_id=${address.placeId}`,
          };
          address.googleMapsLink = `https://www.google.com/maps/place/?q=place_id:${address.placeId}`;
        } else if (address.formattedAddress) {
          // Fallback to text search
          const encodedAddress = encodeURIComponent(address.formattedAddress);
          address.navigationLinks = {
            googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
            googleMapsDirections: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
          };
          address.googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        } else {
          // Last resort - construct from components
          const addressString = `${address.addressLine}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
          const encodedAddress = encodeURIComponent(addressString);
          address.navigationLinks = {
            googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
            googleMapsDirections: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
          };
          address.googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        }

        // Add coordinates object for easy access
        if (address.latitude && address.longitude) {
          address.coordinates = {
            lat: parseFloat(address.latitude),
            lng: parseFloat(address.longitude),
          };
        }

        // Add a simple method to get best available link
        address.getBestNavigationLink = () => {
          if (address.latitude && address.longitude) {
            return `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`;
          }
          return address.googleMapsLink;
        };
      }

      return orderJson;
    });
    const response = formatPagination(
      {
        count: orders.count, // ✅ FIXED
        rows: ordersWithLinks,
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

exports.verifyDeliveryOtp = async (req, res) => {
  try {
    const { orderNumber, otp } = req.body;

    if (!orderNumber || !otp) {
      throw new Error("orderNumber and otp required");
    }

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    // must belong to this delivery boy
    if (order.deliveryBoyId !== req.deliveryBoy.id) {
      throw new Error("Not authorized for this order");
    }

    if (order.status !== "out_for_delivery") {
      throw new Error("Order not in deliverable state");
    }

    // Simple OTP check
    if (order.otp !== otp) {
      throw new Error("Invalid OTP");
    }

    const updateData = {
      otpVerified: true,
      otp: null, // remove OTP after successful verification
      deliveredAt: new Date(),
    };

    // Update status based on payment method
    if (order.paymentMethod === "COD") {
      updateData.status = "completed"; // COD: mark delivered
      updateData.completedAt = new Date();
      updateData.paymentStatus = "paid";
    } else {
      updateData.status = "completed"; // Online: mark completed
      updateData.completedAt = new Date();
      updateData.paymentStatus = "paid";
    }

    await order.update(updateData);

    res.json({
      success: true,
      message:
        order.paymentMethod === "COD"
          ? "Delivered. Collect cash & confirm payment."
          : "Order completed successfully.",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.confirmCodPayment = async (req, res) => {
  try {
    const { orderNumber } = req.body;

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    if (order.deliveryBoyId !== req.deliveryBoy.id) {
      throw new Error("Not authorized");
    }

    if (order.paymentMethod !== "COD") {
      throw new Error("Not a COD order");
    }

    if (order.status !== "delivered") {
      throw new Error("Order not delivered yet");
    }

    await order.update({
      status: "completed",
      paymentStatus: "paid",
      completedAt: new Date(),
    });

    res.json({
      success: true,
      message: "COD payment confirmed. Order completed.",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
