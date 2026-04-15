const crypto = require("crypto");
const {
  Order,
  OrderItem,
  OrderAddress,
  CartItem,
  Product,
  ProductPrice,
  ProductVariant,
  VariantSize,
  sequelize,
  ProductAttribute,
  ProductMeasurement,
  MeasurementMaster,
  StoreInventory,
  Store,
  User,
  DeliverySlot,
} = require("../../models");

const UserAddress = require("../../models/orders/userAddress.model");
const { generateOrderNumber } = require("../../utils/helpers");
const priceService = require("../../services/price.service");

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const generateInvoice = require("../../utils/generateInvoice");
const { sendInvoiceEmail } = require("../../utils/email");
const { getDistanceKm } = require("../../utils/distance");
const { getDeliveryCharge } = require("../../utils/deliveryCharges");
const { getAvailableSlots } = require("../../services/slot.service");
const moment = require("moment");

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
}

exports.placeOrder = async (req, res) => {
  let t;

  try {
    t = await sequelize.transaction();

    const userId = req.user.id;
    const {
      addressId,
      paymentMethod,
      buyNow,
      deliveryType = "delivery",
      deliverySlotId: requestedSlotId,
      deliveryDate: requestedDate,
      pickupTime, // Optional: customer can specify pickup time
    } = req.body;

    if (!addressId) throw new Error("Address is required");

    // Fetch user address with coordinates from database
    const userAddress = await UserAddress.findOne({
      where: { id: addressId, userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!userAddress) throw new Error("Invalid address");

    // Get user email
    const user = await User.findByPk(userId, {
      attributes: ["email"],
      transaction: t,
    });

    if (!user) throw new Error("User not found");

    // Get coordinates from the stored address
    const userLatitude = userAddress.latitude;
    const userLongitude = userAddress.longitude;

    // Validate coordinates for delivery
    if (deliveryType === "delivery" && (!userLatitude || !userLongitude)) {
      throw new Error(
        "Address coordinates missing. Please update your address with valid latitude and longitude."
      );
    }

    let orderSourceItems = [];
    let storeId = null;

    // Helper functions
    const formatAttributes = (arr) => {
      const obj = {};
      (arr || []).forEach((attr) => {
        obj[attr.attributeKey] = attr.attributeValue;
      });
      return obj;
    };

    const formatMeasurements = (arr) => {
      const obj = {};
      (arr || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        obj[label] = `${m.value}${unit}`;
      });
      return obj;
    };

    // ================= BUY NOW =================
    if (buyNow) {
      const { productId, variantId, quantity } = buyNow;

      const product = await Product.findByPk(productId, {
        include: [
          {
            model: ProductAttribute,
            as: "attributes",
            attributes: ["attributeKey", "attributeValue"],
          },
          {
            model: ProductMeasurement,
            as: "measurements",
            attributes: ["measurementId", "value"],
            include: [
              {
                model: MeasurementMaster,
                as: "measurement",
                attributes: ["name", "unit"],
              },
            ],
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const variant = await ProductVariant.findByPk(variantId, {
        include: [
          {
            model: ProductPrice,
            as: "price",
          },
          {
            model: ProductAttribute,
            as: "attributes",
            attributes: ["attributeKey", "attributeValue"],
          },
          {
            model: ProductMeasurement,
            as: "measurements",
            attributes: ["measurementId", "value"],
            include: [
              {
                model: MeasurementMaster,
                as: "measurement",
                attributes: ["name", "unit"],
              },
            ],
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!product || !variant) throw new Error("Invalid Buy Now product");

      storeId = variant.storeId || product.storeId;

      if (!storeId) throw new Error("Store information missing");

      // Get store inventory
      const storeInventory = await StoreInventory.findOne({
        where: {
          variantId: variant.id,
          storeId: storeId,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const currentStock = storeInventory?.stock || 0;

      if (currentStock < quantity) {
        throw new Error(`Insufficient stock. Available: ${currentStock}`);
      }

      // Get dynamic price
      const priceResult = await priceService.getFinalPrice(variantId, quantity);
      const basePrice = Number(priceResult.price);

      orderSourceItems = [
        {
          product,
          variant,
          quantity,
          productId,
          variantId,
          storeId,
          storeInventory,
          basePrice,
          priceResult,
        },
      ];
    }
    // ================= CART =================
    else {
      orderSourceItems = await CartItem.findAll({
        where: { userId },
        distinct: true,
        include: [
          {
            model: Product,
            as: "product",
            include: [
              {
                model: ProductAttribute,
                as: "attributes",
                attributes: ["attributeKey", "attributeValue"],
              },
              {
                model: ProductMeasurement,
                as: "measurements",
                attributes: ["measurementId", "value"],
                include: [
                  {
                    model: MeasurementMaster,
                    as: "measurement",
                    attributes: ["name", "unit"],
                  },
                ],
              },
            ],
          },
          {
            model: ProductVariant,
            as: "variant",
            include: [
              {
                model: ProductPrice,
                as: "price",
              },
              {
                model: ProductAttribute,
                as: "attributes",
                attributes: ["attributeKey", "attributeValue"],
              },
              {
                model: ProductMeasurement,
                as: "measurements",
                attributes: ["measurementId", "value"],
                include: [
                  {
                    model: MeasurementMaster,
                    as: "measurement",
                    attributes: ["name", "unit"],
                  },
                ],
              },
            ],
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!orderSourceItems.length) throw new Error("Cart is empty");

      // Get storeId from first item (assuming all items from same store)
      storeId = orderSourceItems[0].storeId;

      if (!storeId) throw new Error("Store information missing");

      // Get store inventories for all items
      const inventories = await StoreInventory.findAll({
        where: {
          storeId: storeId,
          variantId: orderSourceItems.map((item) => item.variantId),
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const inventoryMap = {};
      inventories.forEach((inv) => {
        inventoryMap[inv.variantId] = inv;
      });

      // Add inventory and dynamic price to each cart item
      for (const item of orderSourceItems) {
        const storeInventory = inventoryMap[item.variantId];

        if (!storeInventory || storeInventory.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.product?.title || "product"}`
          );
        }

        const priceResult = await priceService.getFinalPrice(
          item.variantId,
          item.quantity
        );
        item.storeInventory = storeInventory;
        item.basePrice = Number(priceResult.price);
        item.priceResult = priceResult;
      }
    }

    // ================= CALCULATE ORDER TOTALS =================
    let subtotal = 0;
    let totalTax = 0;
    const processedCheck = new Set();
    const orderItemsData = [];

    for (const item of orderSourceItems) {
      const itemKey = item.id
        ? item.id.toString()
        : `${item.productId}-${item.variantId}`;
      if (processedCheck.has(itemKey)) continue;
      processedCheck.add(itemKey);

      const basePrice = item.basePrice;
      const qty = Number(item.quantity);
      const gstRate = Number(item.product?.gstRate || 0);
      const stock = item.storeInventory?.stock || 0;

      if (!basePrice || qty <= 0) throw new Error("Invalid order item");
      if (stock < qty) {
        throw new Error(
          `Insufficient stock for ${item.product?.title || "product"}. Available: ${stock}`
        );
      }

      const gstPerUnit = Math.round((basePrice * gstRate) / 100);
      const finalPerUnit = basePrice + gstPerUnit;

      const itemSubtotal = basePrice * qty;
      const itemTax = gstPerUnit * qty;
      const itemTotal = finalPerUnit * qty;

      subtotal += itemSubtotal;
      totalTax += itemTax;

      // Create product snapshot
      const productSnapshot = {
        id: item.product?.id,
        sku: item.product?.sku,
        title: item.product?.title,
        description: item.product?.description,
        brandName: item.product?.brandName,
        badge: item.product?.badge,
        gstRate: item.product?.gstRate,
        attributes: formatAttributes(item.product?.attributes),
        measurements: formatMeasurements(item.product?.measurements),
      };

      // Create variant snapshot
      const variantSnapshot = {
        id: item.variant?.id,
        variantCode: item.variant?.variantCode,
        unit: item.variant?.unit,
        moq: item.variant?.moq,
        packingType: item.variant?.packingType,
        packQuantity: item.variant?.packQuantity,
        dispatchType: item.variant?.dispatchType,
        deliverySla: item.variant?.deliverySla,
        mrp: item.variant?.price?.mrp || 0,
        sellingPrice: item.variant?.price?.sellingPrice || 0,
        attributes: formatAttributes(item.variant?.attributes),
        measurements: formatMeasurements(item.variant?.measurements),
      };

      // Prepare variant info JSON
      const variantInfo = {
        variantCode: item.variant?.variantCode,
        unit: item.variant?.unit,
        moq: item.variant?.moq,
        packingType: item.variant?.packingType,
        packQuantity: item.variant?.packQuantity,
        dispatchType: item.variant?.dispatchType,
        deliverySla: item.variant?.deliverySla,
        price: {
          mrp: item.variant?.price?.mrp || 0,
          sellingPrice: item.variant?.price?.sellingPrice || 0,
          basePrice: basePrice,
          gstRate: gstRate,
          gstPerUnit: gstPerUnit,
          finalPerUnit: finalPerUnit,
        },
      };

      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product?.title || "Product",
        quantity: qty,
        basePrice: basePrice,
        gstRate: gstRate,
        gstPerUnit: gstPerUnit,
        finalPerUnit: finalPerUnit,
        subTotal: itemSubtotal,
        taxTotal: itemTax,
        totalPrice: itemTotal,
        productSnapshot: productSnapshot,
        variantSnapshot: variantSnapshot,
        variantInfo: variantInfo,
        storeInventory: item.storeInventory,
      });
    }

    // ================= GET STORE AND CALCULATE DISTANCE =================
    let distanceKm = 0;
    let shippingFee = 0;
    let assignedDeliverySlotId = null;
    let assignedDeliveryDate = null;
    let pickupInstructions = null;

    const store = await Store.findByPk(storeId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!store) throw new Error("Store not found");

    if (deliveryType === "delivery") {
      // Validate store coordinates
      if (!store.latitude || !store.longitude) {
        throw new Error("Store location coordinates not configured");
      }

      // Calculate distance
      distanceKm = getDistanceKm(
        Number(userLatitude),
        Number(userLongitude),
        Number(store.latitude),
        Number(store.longitude)
      );

      console.log(`Distance calculated: ${distanceKm.toFixed(2)}km between user address and store`);

      // Check if delivery is available at this distance
      const deliveryRadius = store.deliveryRadius || 8;
      if (distanceKm > deliveryRadius) {
        throw new Error(
          `❌ Delivery not available to your location (${distanceKm.toFixed(2)}km > 8km). ` +
          `Please choose "self-pickup" option. You can collect your order from our store at: ${store.address || store.location}`
        );
      }

      // ================= DELIVERY SLOT VALIDATION =================
      if (!requestedSlotId || !requestedDate) {
        throw new Error("Please select a delivery slot for delivery orders");
      }

      // Validate slot exists and is available
      const slot = await DeliverySlot.findOne({
        where: {
          id: requestedSlotId,
          date: requestedDate,
          status: "available",
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!slot) {
        throw new Error("Selected delivery slot is no longer available");
      }

      // Check capacity
      if (slot.currentOrders >= slot.maxCapacity) {
        throw new Error("Delivery slot is full. Please select another slot");
      }

      // Check 30-min buffer for today
      const now = new Date();
      const bufferTime = new Date(now.getTime() + 30 * 60000);
      const slotStart = new Date(`${slot.date}T${slot.startTime}`);
      const isToday = requestedDate === new Date().toISOString().split('T')[0];

      if (isToday && slotStart <= bufferTime) {
        const nextSlotTime = new Date(bufferTime);
        nextSlotTime.setMinutes(Math.ceil(nextSlotTime.getMinutes() / 60) * 60);
        throw new Error(
          `⚠️ Minimum 30 minutes preparation time required. ` +
          `Earliest available slot is after ${nextSlotTime.toLocaleTimeString()}. ` +
          `Please select a later slot or choose tomorrow.`
        );
      }

      if (slotStart <= now && isToday) {
        throw new Error("Cannot select a past delivery slot");
      }

      // Reserve the slot
      await slot.increment("currentOrders", { transaction: t });
      if (slot.currentOrders + 1 >= slot.maxCapacity) {
        await slot.update({ status: "full" }, { transaction: t });
      }

      assignedDeliverySlotId = slot.id;
      assignedDeliveryDate = requestedDate;

      // Calculate shipping fee
      const delivery = getDeliveryCharge(distanceKm, subtotal, "delivery");
      if (!delivery.isServiceable) {
        throw new Error(delivery.message);
      }
      shippingFee = delivery.deliveryCharge;
      
    } else if (deliveryType === "pickup") {
      // ================= SELF-PICKUP VALIDATION =================
      const currentTime = moment().tz("Asia/Kolkata").format("HH:mm:ss");
      
      // Check if store is open for pickup
      if (currentTime < store.openTime) {
        throw new Error(
          `Store opens at ${store.openTime}. Pickup available after opening time. ` +
          `Please visit the store between ${store.openTime} - ${store.closeTime}`
        );
      }
      
      if (currentTime > store.closeTime) {
        throw new Error(
          `Store closed at ${store.closeTime}. Please visit tomorrow for pickup. ` +
          `Store hours: ${store.openTime} - ${store.closeTime}`
        );
      }
      
      // No shipping fee for pickup
      shippingFee = 0;
      distanceKm = userLatitude && userLongitude ? 
        getDistanceKm(userLatitude, userLongitude, store.latitude, store.longitude) : null;
      
      // Prepare pickup instructions
      pickupInstructions = {
        storeName: store.name,
        storeAddress: store.address || store.location,
        storeTiming: `${store.openTime} - ${store.closeTime}`,
        message: "Please visit the store with your order number and OTP to collect your items.",
        whatToBring: ["Order Number", "OTP", "Valid ID proof"],
        pickupWindow: "Same day pickup available during store hours"
      };
      
      console.log(`✅ Self-pickup order - Store: ${store.name}`);
    }

    const totalAmount = subtotal + totalTax + shippingFee;

    // COD allowed only below ₹5000
    const isCOD = paymentMethod === "COD";
    if (isCOD && totalAmount >= 5000) {
      throw new Error("Cash on Delivery is only available for orders below ₹5000");
    }

    // const otp = isCOD ? generateOtp() : null;
   

// Generate OTPs based on order type
let customerDeliveryOtp = null;    // For delivery boy to verify at customer door
let customerPickupOtp = null;       // For store admin to verify for pickup orders
let deliveryBoyPickupOtp = null;    // For store admin to verify for delivery boy pickup

if (deliveryType === "delivery") {
  customerDeliveryOtp = generateOtp();      // Customer receives this for delivery
  deliveryBoyPickupOtp = generateOtp();     // Delivery boy shows this at store
} else if (deliveryType === "pickup") {
  customerPickupOtp = generateOtp();        // Customer shows this at store
}

    // ================= CREATE ORDER =================
    const order = await Order.create(
      {
        userId,
        orderNumber: generateOrderNumber(),
        subtotal: Math.round(subtotal),
        taxAmount: Math.round(totalTax),
        shippingFee: Math.round(shippingFee),
        totalAmount: Math.round(totalAmount),
        status: isCOD ? "confirmed" : "pending",
        paymentMethod,
        paymentStatus: "unpaid",
         otp: customerDeliveryOtp,                 // For customer delivery
  pickupOtp: customerPickupOtp,             // For customer pickup
  deliveryPickupOtp: deliveryBoyPickupOtp, 
        otpVerified: false,
        confirmedAt: isCOD ? new Date() : null,
        deliverySlotId: assignedDeliverySlotId,
        deliveryDate: assignedDeliveryDate,
        distanceKm: distanceKm ? Number(distanceKm.toFixed(2)) : null,
        deliveryType: deliveryType,
        invoiceStatus: "pending",
        invoiceUrl: null,
      },
      { transaction: t }
    );

    // ================= ORDER ITEMS =================
    const orderItems = [];
    const processedItemsForSnapshot = new Set();

    for (const itemData of orderItemsData) {
      const itemKey = `${itemData.productId}-${itemData.variantId}`;
      if (processedItemsForSnapshot.has(itemKey)) continue;
      processedItemsForSnapshot.add(itemKey);

      orderItems.push({
        orderId: order.id,
        productId: itemData.productId,
        variantId: itemData.variantId,
        productName: itemData.productName,
        quantity: itemData.quantity,
        basePrice: itemData.basePrice,
        gstRate: itemData.gstRate,
        gstPerUnit: itemData.gstPerUnit,
        finalPerUnit: itemData.finalPerUnit,
        subTotal: itemData.subTotal,
        taxTotal: itemData.taxTotal,
        totalPrice: itemData.totalPrice,
        productSnapshot: itemData.productSnapshot,
        variantSnapshot: itemData.variantSnapshot,
        variantInfo: itemData.variantInfo,
      });
    }

    await OrderItem.bulkCreate(orderItems, { transaction: t });
    console.log(`✅ Created ${orderItems.length} order items`);

    // ================= ADDRESS SNAPSHOT =================
    const addressData = {
      orderId: order.id,
      fullName: userAddress.fullName,
      email: userAddress.email,
      phoneNumber: userAddress.phoneNumber,
      addressLine: userAddress.addressLine,
      city: userAddress.city,
      state: userAddress.state,
      zipCode: userAddress.zipCode,
      country: userAddress.country,
    };

    // Add optional fields
    if (userAddress.house) addressData.house = userAddress.house;
    if (userAddress.neighborhood) addressData.neighborhood = userAddress.neighborhood;
    if (userAddress.landmark) addressData.landmark = userAddress.landmark;
    if (userAddress.area) addressData.area = userAddress.area;
    if (userAddress.locality) addressData.locality = userAddress.locality;
    if (userAddress.selectedAddressLine) addressData.selectedAddressLine = userAddress.selectedAddressLine;
    if (userAddress.latitude) addressData.latitude = userAddress.latitude;
    if (userAddress.longitude) addressData.longitude = userAddress.longitude;
    if (userAddress.placeId) addressData.placeId = userAddress.placeId;

    addressData.formattedAddress = userAddress.formattedAddress ||
      `${userAddress.addressLine}, ${userAddress.city}, ${userAddress.state} ${userAddress.zipCode}, ${userAddress.country}`;

    await OrderAddress.create(addressData, { transaction: t });

    // ================= STOCK DEDUCT =================
    for (const itemData of orderItemsData) {
      await StoreInventory.decrement("stock", {
        by: itemData.quantity,
        where: {
          id: itemData.storeInventory.id,
          storeId: storeId,
          variantId: itemData.variantId,
        },
        transaction: t,
      });

      const remainingStock = await StoreInventory.sum("stock", {
        where: { variantId: itemData.variantId },
        transaction: t,
      });

      await ProductVariant.update(
        {
          totalStock: remainingStock,
          stockStatus: remainingStock > 0 ? "In Stock" : "Out of Stock",
        },
        { where: { id: itemData.variantId }, transaction: t }
      );
    }

    // Clear cart if not buy now
    if (!buyNow) {
      await CartItem.destroy({ where: { userId }, transaction: t });
    }

    // ================= COMMIT TRANSACTION =================
    await t.commit();

    // ================= GENERATE INVOICE AFTER COMMIT =================
    let invoicePath = null;
    const fs = require('fs');
    const path = require('path');
    
    try {
      console.log("📄 Generating invoice for order:", order.orderNumber);
      console.log("Order items count:", orderItems.length);
      
      // Ensure invoices directory exists
      const invoiceDir = path.join(process.cwd(), 'invoices');
      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
      }
      
      // Generate invoice using in-memory data
      invoicePath = await generateInvoice({
        order: order.toJSON ? order.toJSON() : order,
        orderItems: orderItems.map(item => item.toJSON ? item.toJSON() : item),
        address: addressData,
      });
      
      if (invoicePath && fs.existsSync(invoicePath)) {
        console.log("✅ Invoice generated successfully at:", invoicePath);
        
        // Update database with invoice info
        await Order.update(
          {
            invoiceUrl: invoicePath,
            invoiceStatus: "generated",
          },
          {
            where: { id: order.id },
          }
        );
        console.log("✅ Invoice URL saved to database for order:", order.orderNumber);
      } else {
        console.warn("⚠️ Invoice generation returned invalid path");
        await Order.update(
          { invoiceStatus: "failed" },
          { where: { id: order.id } }
        );
      }
      
    } catch (err) {
      console.error("❌ Invoice generation failed:", err.message);
      await Order.update(
        { invoiceStatus: "failed" },
        { where: { id: order.id } }
      ).catch(console.error);
    }

    // ================= SEND EMAIL =================
    if (process.env.NODE_ENV !== "test") {
      const invoiceExists = invoicePath && fs.existsSync(invoicePath);
      
      sendInvoiceEmail({
        orderNumber: order.orderNumber,
        orderAddress: addressData,
        orderItems: orderItems,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        shippingFee: order.shippingFee,
        distanceKm: distanceKm ? distanceKm.toFixed(2) : "N/A",
        deliveryType: deliveryType,
        invoicePath: invoiceExists ? invoicePath : null,
      }).catch((err) => {
        console.error("❌ Email sending failed:", err);
      });
    }

    // ================= RESPONSE =================
const responseData = {
  success: true,
  orderNumber: order.orderNumber,
  totalAmount: order.totalAmount,
  subtotal: order.subtotal,
  taxAmount: order.taxAmount,
  shippingFee: order.shippingFee,
  distanceKm: distanceKm ? distanceKm.toFixed(2) : "N/A",
  deliveryType: deliveryType,
};

if (isCOD) {
  if (deliveryType === "delivery") {
    responseData.message = "Order placed for delivery with Cash on Delivery";
    responseData.customerOtp = customerDeliveryOtp;        // Customer shows this to delivery boy
    responseData.deliveryBoyPickupOtp = deliveryBoyPickupOtp; // Delivery boy shows this at store
    responseData.deliverySlotId = assignedDeliverySlotId;
    responseData.deliveryDate = assignedDeliveryDate;
    responseData.instructions = {
      customer: `Show OTP ${customerDeliveryOtp} to the delivery boy when receiving your order`,
      deliveryBoy: `Show OTP ${deliveryBoyPickupOtp} at the store to collect the items`
    };
  } else if (deliveryType === "pickup") {
    responseData.message = "Order placed for self-pickup with Cash on Delivery";
    responseData.pickupOtp = customerPickupOtp;  // Customer shows this at store
    responseData.pickupInstructions = pickupInstructions;
    responseData.instructions = {
      customer: `Show OTP ${customerPickupOtp} at the store counter to collect your order`
    };
  }
  
  return res.json(responseData);
}

// For online payments (Razorpay)
const razorpayOrder = await razorpay.orders.create({
  amount: Math.round(order.totalAmount * 100),
  currency: "INR",
  receipt: order.orderNumber,
  notes: {
    orderNumber: order.orderNumber,
    userId: userId.toString(),
    distanceKm: distanceKm ? distanceKm.toFixed(2) : "N/A",
    deliveryType: deliveryType,
  },
});

responseData.razorpayOrderId = razorpayOrder.id;
responseData.amount = razorpayOrder.amount;
responseData.currency = "INR";
responseData.key = process.env.RAZORPAY_KEY_ID;

// Add OTPs for online payment orders as well
if (deliveryType === "delivery") {
  responseData.customerOtp = customerDeliveryOtp;
  responseData.deliveryBoyPickupOtp = deliveryBoyPickupOtp;
  responseData.deliverySlotId = assignedDeliverySlotId;
  responseData.deliveryDate = assignedDeliveryDate;
  responseData.instructions = {
    customer: `Show OTP ${customerDeliveryOtp} to the delivery boy when receiving your order`,
    deliveryBoy: `Show OTP ${deliveryBoyPickupOtp} at the store to collect the items`
  };
} else if (deliveryType === "pickup") {
  responseData.pickupOtp = customerPickupOtp;
  responseData.pickupInstructions = pickupInstructions;
  responseData.instructions = {
    customer: `Show OTP ${customerPickupOtp} at the store counter to collect your order`
  };
}

responseData.orderDetails = {
  subtotal: order.subtotal,
  taxAmount: order.taxAmount,
  shippingFee: order.shippingFee,
  totalAmount: order.totalAmount,
  distanceKm: distanceKm ? distanceKm.toFixed(2) : "N/A",
  deliveryType: deliveryType,
};

return res.json(responseData);
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    console.error("PLACE ORDER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// exports.placeOrder = async (req, res) => {
//   let t;

//   try {
//     t = await sequelize.transaction();

//     const userId = req.user.id;
//     const {
//       addressId,
//       paymentMethod,
//       buyNow,
//       shippingType = "delivery",
//     } = req.body;

//     if (!addressId) throw new Error("Address is required");

//     // Fetch user address with coordinates from database
//     const userAddress = await UserAddress.findOne({
//       where: { id: addressId, userId },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!userAddress) throw new Error("Invalid address");

//     // Get user email
//     const user = await User.findByPk(userId, {
//       attributes: ["email"],
//       transaction: t,
//     });

//     if (!user) throw new Error("User not found");

//     // Get coordinates from the stored address
//     const userLatitude = userAddress.latitude;
//     const userLongitude = userAddress.longitude;

//     if (shippingType === "delivery" && (!userLatitude || !userLongitude)) {
//       throw new Error(
//         "Address coordinates missing. Please update your address with valid latitude and longitude.",
//       );
//     }

//     let orderSourceItems = [];
//     let storeId = null;

//     // Helper functions
//     const formatAttributes = (arr) => {
//       const obj = {};
//       (arr || []).forEach((attr) => {
//         obj[attr.attributeKey] = attr.attributeValue;
//       });
//       return obj;
//     };

//     const formatMeasurements = (arr) => {
//       const obj = {};
//       (arr || []).forEach((m) => {
//         const label = m.measurement?.name || `ID_${m.measurementId}`;
//         const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
//         obj[label] = `${m.value}${unit}`;
//       });
//       return obj;
//     };

//     // ================= BUY NOW =================
//     if (buyNow) {
//       const { productId, variantId, quantity } = buyNow;

//       const product = await Product.findByPk(productId, {
//         include: [
//           {
//             model: ProductAttribute,
//             as: "attributes",
//             attributes: ["attributeKey", "attributeValue"],
//           },
//           {
//             model: ProductMeasurement,
//             as: "measurements",
//             attributes: ["measurementId", "value"],
//             include: [
//               {
//                 model: MeasurementMaster,
//                 as: "measurement",
//                 attributes: ["name", "unit"],
//               },
//             ],
//           },
//         ],
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const variant = await ProductVariant.findByPk(variantId, {
//         include: [
//           {
//             model: ProductPrice,
//             as: "price",
//           },
//           {
//             model: ProductAttribute,
//             as: "attributes",
//             attributes: ["attributeKey", "attributeValue"],
//           },
//           {
//             model: ProductMeasurement,
//             as: "measurements",
//             attributes: ["measurementId", "value"],
//             include: [
//               {
//                 model: MeasurementMaster,
//                 as: "measurement",
//                 attributes: ["name", "unit"],
//               },
//             ],
//           },
//         ],
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!product || !variant) throw new Error("Invalid Buy Now product");

//       storeId = variant.storeId || product.storeId;

//       if (!storeId) throw new Error("Store information missing");

//       // Get store inventory
//       const storeInventory = await StoreInventory.findOne({
//         where: {
//           variantId: variant.id,
//           storeId: storeId,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const currentStock = storeInventory?.stock || 0;

//       if (currentStock < quantity) {
//         throw new Error(`Insufficient stock. Available: ${currentStock}`);
//       }

//       // Get dynamic price
//       const priceResult = await priceService.getFinalPrice(variantId, quantity);
//       const basePrice = Number(priceResult.price);

//       orderSourceItems = [
//         {
//           product,
//           variant,
//           quantity,
//           productId,
//           variantId,
//           storeId,
//           storeInventory,
//           basePrice,
//           priceResult,
//         },
//       ];
//     }
//     // ================= CART =================
//     else {
//       orderSourceItems = await CartItem.findAll({
//         where: { userId },
//         distinct: true,
//         include: [
//           {
//             model: Product,
//             as: "product",
//             include: [
//               {
//                 model: ProductAttribute,
//                 as: "attributes",
//                 attributes: ["attributeKey", "attributeValue"],
//               },
//               {
//                 model: ProductMeasurement,
//                 as: "measurements",
//                 attributes: ["measurementId", "value"],
//                 include: [
//                   {
//                     model: MeasurementMaster,
//                     as: "measurement",
//                     attributes: ["name", "unit"],
//                   },
//                 ],
//               },
//             ],
//           },
//           {
//             model: ProductVariant,
//             as: "variant",
//             include: [
//               {
//                 model: ProductPrice,
//                 as: "price",
//               },
//               {
//                 model: ProductAttribute,
//                 as: "attributes",
//                 attributes: ["attributeKey", "attributeValue"],
//               },
//               {
//                 model: ProductMeasurement,
//                 as: "measurements",
//                 attributes: ["measurementId", "value"],
//                 include: [
//                   {
//                     model: MeasurementMaster,
//                     as: "measurement",
//                     attributes: ["name", "unit"],
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!orderSourceItems.length) throw new Error("Cart is empty");

//       // Get storeId from first item (assuming all items from same store)
//       storeId = orderSourceItems[0].storeId;

//       if (!storeId) throw new Error("Store information missing");

//       // Get store inventories for all items
//       const inventories = await StoreInventory.findAll({
//         where: {
//           storeId: storeId,
//           variantId: orderSourceItems.map((item) => item.variantId),
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const inventoryMap = {};
//       inventories.forEach((inv) => {
//         inventoryMap[inv.variantId] = inv;
//       });

//       // Add inventory and dynamic price to each cart item
//       for (const item of orderSourceItems) {
//         const storeInventory = inventoryMap[item.variantId];

//         if (!storeInventory || storeInventory.stock < item.quantity) {
//           throw new Error(
//             `Insufficient stock for ${item.product?.title || "product"}`,
//           );
//         }

//         const priceResult = await priceService.getFinalPrice(
//           item.variantId,
//           item.quantity,
//         );
//         item.storeInventory = storeInventory;
//         item.basePrice = Number(priceResult.price);
//         item.priceResult = priceResult;
//       }
//     }

//     // ================= CALCULATE ORDER TOTALS =================
//     let subtotal = 0;
//     let totalTax = 0;
//     const processedCheck = new Set();
//     const orderItemsData = [];

//     for (const item of orderSourceItems) {
//       const itemKey = item.id
//         ? item.id.toString()
//         : `${item.productId}-${item.variantId}`;
//       if (processedCheck.has(itemKey)) continue;
//       processedCheck.add(itemKey);

//       const basePrice = item.basePrice;
//       const qty = Number(item.quantity);
//       const gstRate = Number(item.product?.gstRate || 0);
//       const stock = item.storeInventory?.stock || 0;

//       if (!basePrice || qty <= 0) throw new Error("Invalid order item");
//       if (stock < qty) {
//         throw new Error(
//           `Insufficient stock for ${item.product?.title || "product"}. Available: ${stock}`,
//         );
//       }

//       const gstPerUnit = Math.round((basePrice * gstRate) / 100);
//       const finalPerUnit = basePrice + gstPerUnit;

//       const itemSubtotal = basePrice * qty;
//       const itemTax = gstPerUnit * qty;
//       const itemTotal = finalPerUnit * qty;

//       subtotal += itemSubtotal;
//       totalTax += itemTax;

//       // Create product snapshot
//       const productSnapshot = {
//         id: item.product?.id,
//         sku: item.product?.sku,
//         title: item.product?.title,
//         description: item.product?.description,
//         brandName: item.product?.brandName,
//         badge: item.product?.badge,
//         gstRate: item.product?.gstRate,
//         attributes: formatAttributes(item.product?.attributes),
//         measurements: formatMeasurements(item.product?.measurements),
//       };

//       // Create variant snapshot
//       const variantSnapshot = {
//         id: item.variant?.id,
//         variantCode: item.variant?.variantCode,
//         unit: item.variant?.unit,
//         moq: item.variant?.moq,
//         packingType: item.variant?.packingType,
//         packQuantity: item.variant?.packQuantity,
//         dispatchType: item.variant?.dispatchType,
//         deliverySla: item.variant?.deliverySla,
//         mrp: item.variant?.price?.mrp || 0,
//         sellingPrice: item.variant?.price?.sellingPrice || 0,
//         attributes: formatAttributes(item.variant?.attributes),
//         measurements: formatMeasurements(item.variant?.measurements),
//       };

//       // Prepare variant info JSON (additional flexible data)
//       const variantInfo = {
//         variantCode: item.variant?.variantCode,
//         unit: item.variant?.unit,
//         moq: item.variant?.moq,
//         packingType: item.variant?.packingType,
//         packQuantity: item.variant?.packQuantity,
//         dispatchType: item.variant?.dispatchType,
//         deliverySla: item.variant?.deliverySla,
//         price: {
//           mrp: item.variant?.price?.mrp || 0,
//           sellingPrice: item.variant?.price?.sellingPrice || 0,
//           basePrice: basePrice,
//           gstRate: gstRate,
//           gstPerUnit: gstPerUnit,
//           finalPerUnit: finalPerUnit,
//         },
//       };

//       orderItemsData.push({
//         productId: item.productId,
//         variantId: item.variantId,
//         productName: item.product?.title || "Product",
//         quantity: qty,
//         basePrice: basePrice,
//         gstRate: gstRate,
//         gstPerUnit: gstPerUnit,
//         finalPerUnit: finalPerUnit,
//         subTotal: itemSubtotal,
//         taxTotal: itemTax,
//         totalPrice: itemTotal,
//         productSnapshot: productSnapshot,
//         variantSnapshot: variantSnapshot,
//         variantInfo: variantInfo,
//         storeInventory: item.storeInventory,
//       });
//     }

//     // ================= GET STORE AND CALCULATE DISTANCE (for delivery only) =================
//     let distanceKm = 0;
//     let shippingFee = 0;

//     if (shippingType === "delivery") {
//       const store = await Store.findByPk(storeId, {
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!store) throw new Error("Store not found");

//       // Validate store coordinates
//       if (!store.latitude || !store.longitude) {
//         throw new Error("Store location coordinates not configured");
//       }

//       // Calculate distance using coordinates from database
//       distanceKm = getDistanceKm(
//         Number(userLatitude),
//         Number(userLongitude),
//         Number(store.latitude),
//         Number(store.longitude),
//       );

//       console.log(
//         `Distance calculated: ${distanceKm.toFixed(2)}km between user address and store`,
//       );

//       // ================= DYNAMIC SHIPPING CALCULATION =================
//       const delivery = getDeliveryCharge(distanceKm, subtotal);

//       if (!delivery.isServiceable) {
//         throw new Error(
//           `Delivery not available at this location. Distance: ${distanceKm.toFixed(2)}km`,
//         );
//       }

//       shippingFee = delivery.deliveryCharge;
//     }

//     const totalAmount = subtotal + totalTax + shippingFee;

//     // COD allowed only below ₹5000
//     const isCOD = paymentMethod === "COD";
//     if (isCOD && totalAmount >= 5000) {
//       throw new Error(
//         "Cash on Delivery is only available for orders below ₹5000",
//       );
//     }

//     const otp = isCOD ? generateOtp() : null;

//     // ================= CREATE ORDER =================
//     const order = await Order.create(
//       {
//         userId,
//         orderNumber: generateOrderNumber(),
//         subtotal: Math.round(subtotal),
//         taxAmount: Math.round(totalTax),
//         shippingFee: Math.round(shippingFee),
//         totalAmount: Math.round(totalAmount),
//         status: isCOD ? "confirmed" : "pending",
//         paymentMethod,
//         paymentStatus: "unpaid",
//         otp: isCOD ? otp : null,
//         otpVerified: false,
//         confirmedAt: isCOD ? new Date() : null,
//       },
//       { transaction: t },
//     );

//     // ================= ORDER ITEMS (MATCHING YOUR MODEL EXACTLY) =================
//     const orderItems = [];
//     const processedItemsForSnapshot = new Set();

//     for (const itemData of orderItemsData) {
//       const itemKey = `${itemData.productId}-${itemData.variantId}`;
//       if (processedItemsForSnapshot.has(itemKey)) continue;
//       processedItemsForSnapshot.add(itemKey);

//       orderItems.push({
//         orderId: order.id,
//         productId: itemData.productId,
//         variantId: itemData.variantId,
//         productName: itemData.productName,
//         quantity: itemData.quantity,
//         basePrice: itemData.basePrice,
//         gstRate: itemData.gstRate,
//         gstPerUnit: itemData.gstPerUnit,
//         finalPerUnit: itemData.finalPerUnit,
//         subTotal: itemData.subTotal,
//         taxTotal: itemData.taxTotal,
//         totalPrice: itemData.totalPrice,
//         productSnapshot: itemData.productSnapshot,
//         variantSnapshot: itemData.variantSnapshot,
//         variantInfo: itemData.variantInfo,
//       });
//     }

//     await OrderItem.bulkCreate(orderItems, { transaction: t });
//     console.log(`✅ Created ${orderItems.length} order items`);

//     // ================= ADDRESS SNAPSHOT =================
//     const addressData = {
//       orderId: order.id,
//       fullName: userAddress.fullName,
//       email: userAddress.email,
//       phoneNumber: userAddress.phoneNumber,
//       addressLine: userAddress.addressLine,
//       city: userAddress.city,
//       state: userAddress.state,
//       zipCode: userAddress.zipCode,
//       country: userAddress.country,
//       shippingType: shippingType,
//     };

//     // Add optional fields
//     if (userAddress.house) addressData.house = userAddress.house;
//     if (userAddress.neighborhood)
//       addressData.neighborhood = userAddress.neighborhood;
//     if (userAddress.landmark) addressData.landmark = userAddress.landmark;
//     if (userAddress.area) addressData.area = userAddress.area;
//     if (userAddress.locality) addressData.locality = userAddress.locality;
//     if (userAddress.selectedAddressLine)
//       addressData.selectedAddressLine = userAddress.selectedAddressLine;
//     if (userAddress.latitude) addressData.latitude = userAddress.latitude;
//     if (userAddress.longitude) addressData.longitude = userAddress.longitude;
//     if (userAddress.placeId) addressData.placeId = userAddress.placeId;

//     addressData.formattedAddress =
//       userAddress.formattedAddress ||
//       `${userAddress.addressLine}, ${userAddress.city}, ${userAddress.state} ${userAddress.zipCode}, ${userAddress.country}`;

//     await OrderAddress.create(addressData, { transaction: t });

//     // ================= STOCK DEDUCT (FOR BOTH COD AND ONLINE PAYMENTS) =================
//     // 🔥 MOVED THIS OUTSIDE THE isCOD CONDITION - NOW WORKS FOR ALL PAYMENT TYPES
//     for (const itemData of orderItemsData) {
//       await StoreInventory.decrement("stock", {
//         by: itemData.quantity,
//         where: {
//           id: itemData.storeInventory.id,
//           storeId: storeId,
//           variantId: itemData.variantId,
//         },
//         transaction: t,
//       });

//       const remainingStock = await StoreInventory.sum("stock", {
//         where: { variantId: itemData.variantId },
//         transaction: t,
//       });

//       await ProductVariant.update(
//         {
//           totalStock: remainingStock,
//           stockStatus: remainingStock > 0 ? "In Stock" : "Out of Stock",
//         },
//         { where: { id: itemData.variantId }, transaction: t },
//       );
//     }

//     // Clear cart if not buy now (for both payment types)
//     if (!buyNow) {
//       await CartItem.destroy({ where: { userId }, transaction: t });
//     }

//     await t.commit();

//     // In your placeOrder controller, after generating invoice:
//     let invoicePath = null;
//     try {
//       invoicePath = await generateInvoice({
//         order,
//         orderItems,
//         address: addressData,
//       });
//       console.log("✅ Invoice generated successfully at:", invoicePath);
//       console.log(
//         "✅ File exists?",
//         invoicePath ? require("fs").existsSync(invoicePath) : false,
//       );
//     } catch (err) {
//       console.error("❌ Invoice generation failed:", err);
//       // Don't throw - order can still be placed without invoice
//     }

//       console.log("📧 About to send email with invoicePath:", invoicePath);
// console.log("📧 Invoice file exists?", invoicePath ? require('fs').existsSync(invoicePath) : false);
// console.log("📧 Order items count:", orderItems.length);
// console.log("📧 Customer email:", addressData.email);
// // After generating invoice
// const fs = require('fs');
// console.log("Invoice path:", invoicePath);
// console.log("Absolute path:", require('path').resolve(invoicePath));
// console.log("File exists:", fs.existsSync(invoicePath));
// console.log("File readable:", fs.accessSync(invoicePath, fs.constants.R_OK));

//     // Send Email (don't await to avoid blocking response)
//     if (process.env.NODE_ENV !== "test") {
//       sendInvoiceEmail({
//         orderNumber: order.orderNumber,
//         orderAddress: addressData,
//         orderItems,
//         totalAmount: order.totalAmount,
//         subtotal: order.subtotal,
//         taxAmount: order.taxAmount,
//         shippingFee: order.shippingFee,
//         distanceKm: distanceKm.toFixed(2),
//         shippingType: shippingType,
//         invoicePath: invoicePath
//       }).catch((err) => {
//     console.error("❌ Email sending failed DETAILS:", err);
//     console.error("Email error stack:", err.stack);
//   });
//     }

//     // ================= RESPONSE =================
//     if (isCOD) {
//       return res.json({
//         success: true,
//         message: "Order placed with Cash on Delivery",
//         orderNumber: order.orderNumber,
//         totalAmount: order.totalAmount,
//         subtotal: order.subtotal,
//         taxAmount: order.taxAmount,
//         shippingFee: order.shippingFee,
//         distanceKm: distanceKm.toFixed(2),
//         shippingType: shippingType,
//         otp: otp,
//       });
//     }

//     // ================= RAZORPAY =================
//     const razorpayOrder = await razorpay.orders.create({
//       amount: Math.round(order.totalAmount * 100),
//       currency: "INR",
//       receipt: order.orderNumber,
//       notes: {
//         orderNumber: order.orderNumber,
//         userId: userId.toString(),
//         distanceKm: distanceKm.toFixed(2),
//         shippingType: shippingType,
//       },
//     });

//     return res.json({
//       success: true,
//       orderNumber: order.orderNumber,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       currency: "INR",
//       key: process.env.RAZORPAY_KEY_ID,
//       orderDetails: {
//         subtotal: order.subtotal,
//         taxAmount: order.taxAmount,
//         shippingFee: order.shippingFee,
//         totalAmount: order.totalAmount,
//         distanceKm: distanceKm.toFixed(2),
//         shippingType: shippingType,
//       },
//     });
//   } catch (err) {
//     if (t && !t.finished) await t.rollback();
//     console.error("PLACE ORDER ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// exports.placeOrder = async (req, res) => {
//   let t;

//   try {
//     t = await sequelize.transaction();

//     const userId = req.user.id;
//     const { addressId, paymentMethod, buyNow } = req.body;

//     if (!addressId) throw new Error("Address is required");

//     const userAddress = await UserAddress.findOne({
//       where: { id: addressId, userId },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!userAddress) throw new Error("Invalid address");

//     let orderSourceItems = [];

//     // ================= BUY NOW =================
//     if (buyNow) {
//       const { productId, variantId, sizeId, quantity } = buyNow;

//       const product = await Product.findByPk(productId, {
//         include: [{ model: ProductPrice, as: "price" }],
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const variant = await ProductVariant.findByPk(variantId, {
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const variantSize = await VariantSize.findByPk(sizeId, {
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!product || !variant || !variantSize)
//         throw new Error("Invalid Buy Now product");

//       orderSourceItems = [
//         {
//           product,
//           variant,
//           variantSize,
//           quantity,
//           productId,
//           variantId,
//           sizeId,
//         },
//       ];
//     }
//     // ================= CART =================
//     else {
//       orderSourceItems = await CartItem.findAll({
//         where: { userId },
//         distinct: true, // 👈 Ensures no duplicate rows from joins
//         include: [
//           {
//             model: Product,
//             as: "product",
//             include: [{ model: ProductPrice, as: "price" }],
//           },
//           { model: ProductVariant, as: "variant" },
//           { model: VariantSize, as: "variantSize" },
//         ],
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!orderSourceItems.length) throw new Error("Cart is empty");
//     }

//     // ================= CALCULATE (PROTECTED LOGIC) =================
//     let subtotal = 0;
//     let totalTax = 0;
//     // క్లౌడ్ సర్వర్లలో Join వల్ల వచ్చే డూప్లికేట్స్ ని ఫిల్టర్ చేయడానికి
//     const processedCheck = new Set();

//     for (const item of orderSourceItems) {
//       // Unique identifier for each item
//       const itemKey = item.id ? item.id.toString() : `${item.productId}-${item.variantId}-${item.sizeId}`;
//       if (processedCheck.has(itemKey)) continue; // ఇప్పటికే కౌంట్ అయితే వదిలేయండి
//       processedCheck.add(itemKey);

//       const price = Number(item.product?.price?.sellingPrice || 0);
//       const qty = Number(item.quantity || 0);
//       const stock = Number(item.variantSize?.stock || 0);
//       const gstRate = Number(item.product?.gstRate || 0);

//       if (!price || qty <= 0) throw new Error("Invalid order item");
//       if (stock < qty)
//         throw new Error(`Insufficient stock for ${item.product.title}`);

//       const itemSubtotal = price * qty;
//       const itemTax = Math.round((itemSubtotal * gstRate) / 100);

//       subtotal += itemSubtotal;
//       totalTax += itemTax;
//     }

//     const shippingFee = subtotal > 5000 ? 0 : 150;
//     const totalAmount = subtotal + totalTax + shippingFee;

//     const isCOD = paymentMethod === "COD";
//     const otp = generateOtp();

//     // ================= CREATE ORDER =================
//     const order = await Order.create(
//       {
//         userId,
//         orderNumber: generateOrderNumber(),
//         subtotal,
//         taxAmount: totalTax,
//         shippingFee,
//         totalAmount: Math.round(totalAmount), // 👈 Rounding for safety
//         status: isCOD ? "confirmed" : "pending",
//         otp,
//         paymentMethod,
//         paymentStatus: "unpaid",
//       },
//       { transaction: t },
//     );

//     // ================= ORDER ITEMS =================
//     // Re-calculating based on unique set to match order total
//     const orderItems = [];
//     const processedItemsForSnapshot = new Set();

//     for (const item of orderSourceItems) {
//       const itemKey = item.id ? item.id.toString() : `${item.productId}-${item.variantId}-${item.sizeId}`;
//       if (processedItemsForSnapshot.has(itemKey)) continue;
//       processedItemsForSnapshot.add(itemKey);

//       const price = Number(item.product.price.sellingPrice);
//       const qty = Number(item.quantity);
//       const gstRate = Number(item.product.gstRate || 0);

//       const itemSubtotal = price * qty;
//       const itemTax = Math.round((itemSubtotal * gstRate) / 100);

//       orderItems.push({
//         orderId: order.id,
//         productId: item.productId,
//         variantId: item.variantId,
//         sizeId: item.sizeId,
//         productName: item.product.title,
//         variantColor: item.variant.colorName,
//         sizeLabel: item.variantSize.size,
//         quantity: qty,
//         priceAtPurchase: price,
//         taxRate: gstRate,
//         taxAmount: itemTax,
//         totalPrice: itemSubtotal + itemTax,
//       });
//     }

//     await OrderItem.bulkCreate(orderItems, { transaction: t });

//     // ================= ADDRESS SNAPSHOT =================
//     let orderAddress = await OrderAddress.create(
//       {
//         orderId: order.id,
//         fullName: userAddress.fullName,
//         email: userAddress.email,
//         phoneNumber: userAddress.phoneNumber,
//         addressLine: userAddress.addressLine,
//         country: userAddress.country,
//         city: userAddress.city,
//         state: userAddress.state,
//         zipCode: userAddress.zipCode,
//         latitude: userAddress.latitude,
//         longitude: userAddress.longitude,
//         placeId: userAddress.placeId,
//         formattedAddress:
//           userAddress.formattedAddress ||
//           `${userAddress.addressLine}, ${userAddress.city}, ${userAddress.state} ${userAddress.zipCode}, ${userAddress.country}`,
//       },
//       { transaction: t },
//     );

//     // ================= STOCK DEDUCT (COD ONLY) =================
//     if (isCOD) {
//       for (const item of orderItems) {
//         await VariantSize.decrement("stock", {
//           by: item.quantity,
//           where: { id: item.sizeId },
//           transaction: t,
//         });
//         const remainingStock = await VariantSize.sum("stock", {
//           where: { variantId: item.variantId },
//           transaction: t,
//         });

//         await ProductVariant.update(
//           {
//             totalStock: remainingStock,
//             stockStatus: remainingStock > 0 ? "In Stock" : "Out of Stock",
//           },
//           { where: { id: item.variantId }, transaction: t },
//         );
//       }

//       if (!buyNow) {
//         await CartItem.destroy({ where: { userId }, transaction: t });
//       }
//     }

//     await t.commit();

//     // Send Email
//     await sendInvoiceEmail({
//       orderNumber: order.orderNumber,
//       orderAddress,
//       totalAmount: order.totalAmount,
//     });

//     // ================= RESPONSE =================
//     if (isCOD) {
//       return res.json({
//         success: true,
//         message: "Order placed with Cash on Delivery",
//         orderNumber: order.orderNumber,
//         totalAmount: order.totalAmount,
//       });
//     }

//     // ================= RAZORPAY (USING CALCULATED TOTAL) =================
//     const razorpayOrder = await razorpay.orders.create({
//       amount: Math.round(order.totalAmount * 100), // convert to paisa and ensure integer
//       currency: "INR",
//       receipt: order.orderNumber,
//     });

//     return res.json({
//       success: true,
//       orderNumber: order.orderNumber,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       currency: "INR",
//       key: process.env.RAZORPAY_KEY_ID,
//     });

//   } catch (err) {
//     if (t && !t.finished) await t.rollback();
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// exports.placeOrder = async (req, res) => {
//   let t;

//   try {
//     t = await sequelize.transaction();

//     const userId = req.user.id;
//     const { addressId, paymentMethod, buyNow, latitude, longitude } = req.body;

//     if (!addressId) throw new Error("Address is required");

//     const userAddress = await UserAddress.findOne({
//       where: { id: addressId, userId },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!userAddress) throw new Error("Invalid address");

//     // Use provided lat/long or get from address
//     const userLatitude = latitude || userAddress.latitude;
//     const userLongitude = longitude || userAddress.longitude;

//     if (!userLatitude || !userLongitude) {
//       throw new Error("Location coordinates required for delivery calculation");
//     }

//     let orderSourceItems = [];
//     let storeId = null;

//     // Helper functions
//     const formatAttributes = (arr) => {
//       const obj = {};
//       (arr || []).forEach((attr) => {
//         obj[attr.attributeKey] = attr.attributeValue;
//       });
//       return obj;
//     };

//     const formatMeasurements = (arr) => {
//       const obj = {};
//       (arr || []).forEach((m) => {
//         const label = m.measurement?.name || `ID_${m.measurementId}`;
//         const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
//         obj[label] = `${m.value}${unit}`;
//       });
//       return obj;
//     };

//     // ================= BUY NOW =================
//     if (buyNow) {
//       const { productId, variantId, quantity } = buyNow;

//       const product = await Product.findByPk(productId, {
//         include: [
//           {
//             model: ProductAttribute,
//             as: "attributes",
//             attributes: ["attributeKey", "attributeValue"],
//           },
//           {
//             model: ProductMeasurement,
//             as: "measurements",
//             attributes: ["measurementId", "value"],
//             include: [{ model: MeasurementMaster, as: "measurement", attributes: ["name", "unit"] }],
//           },
//         ],
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const variant = await ProductVariant.findByPk(variantId, {
//         include: [
//           {
//             model: ProductPrice,
//             as: "price", // This matches your association: ProductVariant.hasOne(ProductPrice, {foreignKey: "variantId", as: "price"})
//           },
//           {
//             model: ProductAttribute,
//             as: "attributes",
//             attributes: ["attributeKey", "attributeValue"],
//           },
//           {
//             model: ProductMeasurement,
//             as: "measurements",
//             attributes: ["measurementId", "value"],
//             include: [{ model: MeasurementMaster, as: "measurement", attributes: ["name", "unit"] }],
//           },
//         ],
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!product || !variant) throw new Error("Invalid Buy Now product");

//       storeId = variant.storeId || product.storeId;

//       if (!storeId) throw new Error("Store information missing");

//       // Get store inventory
//       const storeInventory = await StoreInventory.findOne({
//         where: {
//           variantId: variant.id,
//           storeId: storeId
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const currentStock = storeInventory?.stock || 0;

//       if (currentStock < quantity) {
//         throw new Error(`Insufficient stock. Available: ${currentStock}`);
//       }

//       // Get dynamic price
//       const priceResult = await priceService.getFinalPrice(variantId, quantity);
//       const basePrice = Number(priceResult.price);

//       orderSourceItems = [
//         {
//           product,
//           variant,
//           quantity,
//           productId,
//           variantId,
//           storeId,
//           storeInventory,
//           basePrice,
//           priceResult,
//         },
//       ];
//     }
//     // ================= CART =================
//     else {
//       orderSourceItems = await CartItem.findAll({
//         where: { userId },
//         distinct: true,
//         include: [
//           {
//             model: Product,
//             as: "product",
//             include: [
//               {
//                 model: ProductAttribute,
//                 as: "attributes",
//                 attributes: ["attributeKey", "attributeValue"],
//               },
//               {
//                 model: ProductMeasurement,
//                 as: "measurements",
//                 attributes: ["measurementId", "value"],
//                 include: [{ model: MeasurementMaster, as: "measurement", attributes: ["name", "unit"] }],
//               },
//             ],
//           },
//           {
//             model: ProductVariant,
//             as: "variant",
//             include: [
//               {
//                 model: ProductPrice,
//                 as: "price", // This matches your association
//               },
//               {
//                 model: ProductAttribute,
//                 as: "attributes",
//                 attributes: ["attributeKey", "attributeValue"],
//               },
//               {
//                 model: ProductMeasurement,
//                 as: "measurements",
//                 attributes: ["measurementId", "value"],
//                 include: [{ model: MeasurementMaster, as: "measurement", attributes: ["name", "unit"] }],
//               },
//             ],
//           },
//         ],
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!orderSourceItems.length) throw new Error("Cart is empty");

//       // Get storeId from first item (assuming all items from same store)
//       storeId = orderSourceItems[0].storeId;

//       if (!storeId) throw new Error("Store information missing");

//       // Get store inventories for all items
//       const inventories = await StoreInventory.findAll({
//         where: {
//           storeId: storeId,
//           variantId: orderSourceItems.map(item => item.variantId)
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const inventoryMap = {};
//       inventories.forEach(inv => {
//         inventoryMap[inv.variantId] = inv;
//       });

//       // Add inventory and dynamic price to each cart item
//       for (const item of orderSourceItems) {
//         const storeInventory = inventoryMap[item.variantId];

//         if (!storeInventory || storeInventory.stock < item.quantity) {
//           throw new Error(`Insufficient stock for ${item.product?.title || 'product'}`);
//         }

//         const priceResult = await priceService.getFinalPrice(item.variantId, item.quantity);
//         item.storeInventory = storeInventory;
//         item.basePrice = Number(priceResult.price);
//         item.priceResult = priceResult;
//       }
//     }

//     // ================= GET STORE AND CALCULATE DISTANCE =================
//     const store = await Store.findByPk(storeId, {
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!store) throw new Error("Store not found");

//     const distanceKm = getDistanceKm(
//       Number(userLatitude),
//       Number(userLongitude),
//       Number(store.latitude),
//       Number(store.longitude)
//     );

//     // ================= CALCULATE ORDER TOTALS =================
//     let subtotal = 0;
//     let totalTax = 0;
//     const processedCheck = new Set();
//     const orderItemsData = [];

//     for (const item of orderSourceItems) {
//       const itemKey = item.id ? item.id.toString() : `${item.productId}-${item.variantId}`;
//       if (processedCheck.has(itemKey)) continue;
//       processedCheck.add(itemKey);

//       const basePrice = item.basePrice;
//       const qty = Number(item.quantity);
//       const gstRate = Number(item.product?.gstRate || 0);
//       const stock = item.storeInventory?.stock || 0;

//       if (!basePrice || qty <= 0) throw new Error("Invalid order item");
//       if (stock < qty) {
//         throw new Error(`Insufficient stock for ${item.product?.title || 'product'}. Available: ${stock}`);
//       }

//       const gstPerUnit = Math.round((basePrice * gstRate) / 100);
//       const finalPerUnit = basePrice + gstPerUnit;

//       const itemSubtotal = basePrice * qty;
//       const itemTax = gstPerUnit * qty;
//       const itemTotal = finalPerUnit * qty;

//       subtotal += itemSubtotal;
//       totalTax += itemTax;

//       orderItemsData.push({
//         productId: item.productId,
//         variantId: item.variantId,
//         product: item.product,
//         variant: item.variant,
//         quantity: qty,
//         basePrice,
//         gstRate,
//         gstPerUnit,
//         finalPerUnit,
//         itemSubtotal,
//         itemTax,
//         itemTotal,
//         storeInventory: item.storeInventory,
//         productSnapshot: {
//           id: item.product?.id,
//           sku: item.product?.sku,
//           title: item.product?.title,
//           description: item.product?.description,
//           brandName: item.product?.brandName,
//           badge: item.product?.badge,
//           gstRate: item.product?.gstRate,
//           attributes: formatAttributes(item.product?.attributes),
//           measurements: formatMeasurements(item.product?.measurements),
//         },
//         variantSnapshot: {
//           id: item.variant?.id,
//           variantCode: item.variant?.variantCode,
//           unit: item.variant?.unit,
//           moq: item.variant?.moq,
//           packingType: item.variant?.packingType,
//           packQuantity: item.variant?.packQuantity,
//           dispatchType: item.variant?.dispatchType,
//           deliverySla: item.variant?.deliverySla,
//           mrp: item.variant?.price?.mrp || 0,
//           sellingPrice: item.variant?.price?.sellingPrice || 0,
//           attributes: formatAttributes(item.variant?.attributes),
//           measurements: formatMeasurements(item.variant?.measurements),
//         },
//       });
//     }

//     // ================= DYNAMIC SHIPPING CALCULATION =================
//     const delivery = getDeliveryCharge(distanceKm, subtotal);

//     if (!delivery.isServiceable) {
//       throw new Error("Delivery not available at this location");
//     }

//     const shippingFee = delivery.deliveryCharge;
//     const totalAmount = subtotal + totalTax + shippingFee;

//     // COD allowed only below ₹5000
//     const isCOD = paymentMethod === "COD";
//     if (isCOD && totalAmount >= 5000) {
//       throw new Error("Cash on Delivery is only available for orders below ₹5000");
//     }

//     const otp = isCOD ? generateOtp() : null;

//     // ================= CREATE ORDER =================
//     const order = await Order.create(
//       {
//         userId,
//         orderNumber: generateOrderNumber(),
//         subtotal: Math.round(subtotal),
//         taxAmount: Math.round(totalTax),
//         shippingFee: Math.round(shippingFee),
//         totalAmount: Math.round(totalAmount),
//         status: isCOD ? "confirmed" : "pending",
//         paymentMethod,
//         paymentStatus: "unpaid",
//         otp: isCOD ? otp : null,
//         otpVerified: false,
//         confirmedAt: isCOD ? new Date() : null,
//       },
//       { transaction: t },
//     );

//     // ================= ORDER ITEMS =================
//     const orderItems = [];
//     const processedItemsForSnapshot = new Set();

//     for (const itemData of orderItemsData) {
//       const itemKey = `${itemData.productId}-${itemData.variantId}`;
//       if (processedItemsForSnapshot.has(itemKey)) continue;
//       processedItemsForSnapshot.add(itemKey);

//       // Prepare variant info JSON
//       const variantInfo = {
//         variantCode: itemData.variant?.variantCode,
//         unit: itemData.variant?.unit,
//         moq: itemData.variant?.moq,
//         packingType: itemData.variant?.packingType,
//         packQuantity: itemData.variant?.packQuantity,
//         dispatchType: itemData.variant?.dispatchType,
//         deliverySla: itemData.variant?.deliverySla,
//         mrp: itemData.variantSnapshot.mrp,
//         sellingPrice: itemData.variantSnapshot.sellingPrice,
//         attributes: itemData.variantSnapshot.attributes,
//         measurements: itemData.variantSnapshot.measurements,
//         price: {
//           basePrice: itemData.basePrice,
//           gstRate: itemData.gstRate,
//           gstPerUnit: itemData.gstPerUnit,
//           finalPerUnit: itemData.finalPerUnit,
//         },
//       };

//       orderItems.push({
//         orderId: order.id,
//         productId: itemData.productId,
//         variantId: itemData.variantId,
//         productName: itemData.product?.title || "Product",
//         quantity: itemData.quantity,
//         priceAtPurchase: itemData.basePrice,
//         totalPrice: itemData.itemTotal,
//         variantInfo: variantInfo,
//       });
//     }

//     await OrderItem.bulkCreate(orderItems, { transaction: t });

//     // ================= ADDRESS SNAPSHOT =================
//     const orderAddress = await OrderAddress.create(
//       {
//         orderId: order.id,
//         fullName: userAddress.fullName,
//         phoneNumber: userAddress.phoneNumber,
//         email: userAddress.email,
//         addressType: userAddress.addressType,
//         addressLine: userAddress.addressLine,
//         house: userAddress.house,
//         neighborhood: userAddress.neighborhood,
//         landmark: userAddress.landmark,
//         area: userAddress.area,
//         locality: userAddress.locality,
//         city: userAddress.city,
//         state: userAddress.state,
//         zipCode: userAddress.zipCode,
//         country: userAddress.country,
//         latitude: userAddress.latitude,
//         longitude: userAddress.longitude,
//         placeId: userAddress.placeId,
//         formattedAddress: userAddress.formattedAddress ||
//           `${userAddress.addressLine}, ${userAddress.city}, ${userAddress.state} ${userAddress.zipCode}, ${userAddress.country}`,
//       },
//       { transaction: t },
//     );

//     // ================= STOCK DEDUCT (COD ONLY) =================
//     if (isCOD) {
//       // Deduct stock from StoreInventory
//       for (const itemData of orderItemsData) {
//         await StoreInventory.decrement("stock", {
//           by: itemData.quantity,
//           where: {
//             id: itemData.storeInventory.id,
//             storeId: storeId,
//             variantId: itemData.variantId
//           },
//           transaction: t,
//         });

//         // Update variant total stock
//         const remainingStock = await StoreInventory.sum("stock", {
//           where: { variantId: itemData.variantId },
//           transaction: t,
//         });

//         await ProductVariant.update(
//           {
//             totalStock: remainingStock,
//             stockStatus: remainingStock > 0 ? "In Stock" : "Out of Stock",
//           },
//           { where: { id: itemData.variantId }, transaction: t },
//         );
//       }

//       // Clear cart if not buy now
//       if (!buyNow) {
//         await CartItem.destroy({ where: { userId }, transaction: t });
//       }
//     }

//     await t.commit();

//     // Send Email (don't await to avoid blocking response)
//     if (process.env.NODE_ENV !== 'test') {
//       sendInvoiceEmail({
//         orderNumber: order.orderNumber,
//         orderAddress,
//         orderItems,
//         totalAmount: order.totalAmount,
//         subtotal: order.subtotal,
//         taxAmount: order.taxAmount,
//         shippingFee: order.shippingFee,
//         distanceKm: distanceKm.toFixed(2),
//       }).catch(err => console.error("Email sending failed:", err));
//     }

//     // ================= RESPONSE =================
//     if (isCOD) {
//       return res.json({
//         success: true,
//         message: "Order placed with Cash on Delivery",
//         orderNumber: order.orderNumber,
//         totalAmount: order.totalAmount,
//         subtotal: order.subtotal,
//         taxAmount: order.taxAmount,
//         shippingFee: order.shippingFee,
//         distanceKm: distanceKm.toFixed(2),
//         otp: otp,
//       });
//     }

//     // ================= RAZORPAY =================
//     const razorpayOrder = await razorpay.orders.create({
//       amount: Math.round(order.totalAmount * 100),
//       currency: "INR",
//       receipt: order.orderNumber,
//       notes: {
//         orderNumber: order.orderNumber,
//         userId: userId.toString(),
//         distanceKm: distanceKm.toFixed(2),
//       },
//     });

//     return res.json({
//       success: true,
//       orderNumber: order.orderNumber,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       currency: "INR",
//       key: process.env.RAZORPAY_KEY_ID,
//       orderDetails: {
//         subtotal: order.subtotal,
//         taxAmount: order.taxAmount,
//         shippingFee: order.shippingFee,
//         totalAmount: order.totalAmount,
//         distanceKm: distanceKm.toFixed(2),
//       },
//     });

//   } catch (err) {
//     if (t && !t.finished) await t.rollback();
//     console.error("PLACE ORDER ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

exports.verifyRazorpayPayment = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderNumber,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Payment verification failed");
    }

    const order = await Order.findOne({
      where: { orderNumber },
      include: [OrderItem],
      transaction: t,
      lock: true,
    });

    if (!order) throw new Error("Order not found");

    if (order.paymentStatus === "paid") {
      await t.commit();
      return res.json({ success: true });
    }

    await order.update(
      {
        status: "confirmed",
        paymentStatus: "paid",
        transactionId: razorpay_payment_id,
        paidAt: new Date(),
      },
      { transaction: t },
    );

    //  deduct stock
    for (const item of order.OrderItems) {
      await VariantSize.decrement("stock", {
        by: item.quantity,
        where: { id: item.sizeId },
        transaction: t,
      });

      await ProductVariant.decrement("totalStock", {
        by: item.quantity,
        where: { id: item.variantId },
        transaction: t,
      });
    }

    await CartItem.destroy({
      where: { userId: order.userId },
      transaction: t,
    });

    await t.commit();

    return res.json({
      success: true,
      message: "Payment verified",
    });
  } catch (err) {
    await t.rollback();

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// exports.razorpayWebhook = async (req, res) => {
//   const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

//   try {
//     // 🔐 Verify signature
//     const signature = req.headers["x-razorpay-signature"];

//     const expectedSignature = crypto
//       .createHmac("sha256", webhookSecret)
//       .update(req.body)
//       .digest("hex");

//     if (signature !== expectedSignature) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid signature" });
//     }

//     const event = JSON.parse(req.body.toString());

//     // ================= PAYMENT CAPTURED =================
//     if (event.event === "payment.captured") {
//       const payment = event.payload.payment.entity;
//       const orderNumber = payment.receipt;

//       let t = await sequelize.transaction();

//       try {
//         const order = await Order.findOne({
//           where: { orderNumber },
//           include: [{ model: OrderItem }],
//           transaction: t,
//           lock: t.LOCK.UPDATE,
//         });

//         if (!order) throw new Error("Order not found");

//         // 🛑 Idempotency check
//         if (order.paymentStatus === "paid") {
//           await t.rollback();
//           return res.json({ success: true, message: "Already processed" });
//         }

//         // ================= UPDATE ORDER =================
//         order.paymentStatus = "paid";
//         order.status = "confirmed";
//         await order.save({ transaction: t });

//         // ================= DEDUCT STOCK =================
//         for (const item of order.OrderItems) {
//           await VariantSize.decrement("stock", {
//             by: item.quantity,
//             where: { id: item.sizeId },
//             transaction: t,
//           });

//           await ProductVariant.decrement("totalStock", {
//             by: item.quantity,
//             where: { id: item.variantId },
//             transaction: t,
//           });
//         }

//         // ================= CLEAR CART =================
//         await CartItem.destroy({
//           where: { userId: order.userId },
//           transaction: t,
//         });

//         await t.commit();

//         return res.json({ success: true });
//       } catch (err) {
//         await t.rollback();
//         throw err;
//       }
//     }

//     // ================= PAYMENT FAILED =================
//     if (event.event === "payment.failed") {
//       const payment = event.payload.payment.entity;
//       const orderNumber = payment.receipt;

//       const order = await Order.findOne({ where: { orderNumber } });

//       if (order && order.paymentStatus !== "paid") {
//         order.paymentStatus = "failed";
//         order.status = "cancelled";
//         await order.save();
//       }

//       return res.json({ success: true });
//     }

//     // ================= REFUND PROCESSED =================
//     if (event.event === "refund.processed") {
//       const refund = event.payload.refund.entity;
//       const orderNumber = refund.notes?.orderNumber;

//       const order = await Order.findOne({
//         where: { orderNumber },
//         include: [{ model: OrderItem }],
//       });

//       if (order) {
//         order.status = "refunded";
//         await order.save();

//         // 🔄 Restore stock
//         for (const item of order.OrderItems) {
//           await VariantSize.increment("stock", {
//             by: item.quantity,
//             where: { id: item.sizeId },
//           });

//           await ProductVariant.increment("totalStock", {
//             by: item.quantity,
//             where: { id: item.variantId },
//           });
//         }
//       }

//       return res.json({ success: true });
//     }

//     // default response
//     return res.json({ success: true });
//   } catch (err) {
//     console.error("Webhook error:", err.message);
//     return res.status(500).json({ success: false });
//   }
// };

exports.razorpayWebhook = async (req, res) => {
  const event = JSON.parse(req.body.toString());

  try {
    switch (event.event) {
      case "refund.processed":
        await exports.handleRefundProcessed(event);
        break;

      case "payment.failed":
        await exports.handlePaymentFailed(event);
        break;

      case "payment.captured":
        await exports.handlePaymentCaptured(event);
        break;

      default:
        console.log("Unhandled Razorpay event:", event.event);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

/**
 * Handle Payment Captured Webhook
 */
exports.handlePaymentCaptured = async (event) => {
  const payment = event.payload.payment.entity;
  const orderNumber = payment.receipt;

  let t = await sequelize.transaction();

  try {
    const order = await Order.findOne({
      where: { orderNumber },
      include: [{ model: OrderItem }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      console.error(`Order not found for receipt: ${orderNumber}`);
      await t.rollback();
      return;
    }

    // Check if already processed
    if (order.paymentStatus === "paid") {
      console.log(`Order ${orderNumber} already marked as paid`);
      await t.rollback();
      return;
    }

    // Update order
    order.paymentStatus = "paid";
    order.status = "confirmed";
    order.transactionId = payment.id;
    order.paidAt = new Date();
    await order.save({ transaction: t });

    // Deduct stock
    for (const item of order.OrderItems) {
      await VariantSize.decrement("stock", {
        by: item.quantity,
        where: { id: item.sizeId },
        transaction: t,
      });

      await ProductVariant.decrement("totalStock", {
        by: item.quantity,
        where: { id: item.variantId },
        transaction: t,
      });
    }

    // Clear cart
    await CartItem.destroy({
      where: { userId: order.userId },
      transaction: t,
    });

    await t.commit();
    console.log(`Payment captured successfully for order: ${orderNumber}`);
  } catch (err) {
    await t.rollback();
    console.error("Error processing payment.captured:", err);
    throw err;
  }
};

/**
 * Handle Payment Failed Webhook
 */
exports.handlePaymentFailed = async (event) => {
  const payment = event.payload.payment.entity;
  const orderNumber = payment.receipt;

  try {
    const order = await Order.findOne({ where: { orderNumber } });

    if (order && order.paymentStatus !== "paid") {
      order.paymentStatus = "failed";
      order.status = "cancelled";
      order.failureReason = payment.error_description || "Payment failed";
      await order.save();

      console.log(`Payment failed for order: ${orderNumber}`);
    }
  } catch (err) {
    console.error("Error processing payment.failed:", err);
    throw err;
  }
};

/**
 * Handle Refund Processed Webhook
 */
exports.handleRefundProcessed = async (event) => {
  const refund = event.payload.refund.entity;
  const orderNumber = refund.notes?.orderNumber;

  if (!orderNumber) {
    console.error("Order number missing in refund notes");
    return;
  }

  const t = await sequelize.transaction();

  try {
    const order = await Order.findOne({
      where: { orderNumber },
      include: [{ model: OrderItem }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      console.error("Order not found for refund:", orderNumber);
      await t.rollback();
      return;
    }

    // -----------------------------
    // Update refund state
    // -----------------------------
    order.status = "refunded";
    order.paymentStatus = "refunded";
    order.refundId = refund.id;
    order.refundAmount = refund.amount / 100;
    order.refundedAt = new Date();

    await order.save({ transaction: t });

    // -----------------------------
    // Restore stock AFTER refund success
    // -----------------------------
    for (const item of order.OrderItems) {
      await VariantSize.increment("stock", {
        by: item.quantity,
        where: { id: item.sizeId },
        transaction: t,
      });

      await ProductVariant.increment("totalStock", {
        by: item.quantity,
        where: { id: item.variantId },
        transaction: t,
      });
    }

    await t.commit();

    console.log("Refund completed for order:", orderNumber);
  } catch (err) {
    await t.rollback();
    console.error("Refund webhook error:", err);
    throw err;
  }
};

/**
 * Test Razorpay Configuration
 */
exports.testRazorpayConfig = async (req, res) => {
  try {
    // Test crypto module
    const testCrypto = () => {
      const testHmac = crypto
        .createHmac("sha256", "test")
        .update("test")
        .digest("hex");
      return !!testHmac;
    };

    // Test Razorpay instance
    const testRazorpay = async () => {
      try {
        await razorpay.orders.create({
          amount: 100,
          currency: "INR",
          receipt: "test_receipt",
        });
        return true;
      } catch (error) {
        console.error("Razorpay test failed:", error.message);
        return false;
      }
    };

    const [cryptoWorks, razorpayWorks] = await Promise.all([
      testCrypto(),
      testRazorpay(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        crypto: cryptoWorks ? "working" : "failed",
        razorpay: razorpayWorks ? "working" : "failed",
        config: {
          keyIdPresent: !!process.env.RAZORPAY_KEY_ID,
          keySecretPresent: !!process.env.RAZORPAY_KEY_SECRET,
          webhookSecretPresent: !!process.env.RAZORPAY_WEBHOOK_SECRET,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
