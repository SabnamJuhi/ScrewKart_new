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
} = require("../../models");

const UserAddress = require("../../models/orders/userAddress.model");
const { generateOrderNumber } = require("../../utils/helpers");

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
// const { generateInvoice } = require("../../utils/generateInvoice");
const { sendInvoiceEmail } = require("../../utils/email");

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
}

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
//         distinct: true,
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

//     // ================= CALCULATE =================
//     let subtotal = 0;
//     let totalTax = 0;

//     for (const item of orderSourceItems) {
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
//         totalAmount,
//         status: isCOD ? "confirmed" : "pending",
//         otp,
//         paymentMethod,
//         paymentStatus: "unpaid",
//       },
//       { transaction: t },
//     );

//     // ================= ORDER ITEMS =================
//     const orderItems = orderSourceItems.map((item) => {
//       const price = Number(item.product.price.sellingPrice);
//       const qty = Number(item.quantity);
//       const gstRate = Number(item.product.gstRate || 0);

//       const itemSubtotal = price * qty;
//       const itemTax = Math.round((itemSubtotal * gstRate) / 100);

//       return {
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
//       };
//     });

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

//     // ================= STOCK DEDUCT (COD) =================
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

//     // ================= GENERATE + SEND INVOICE =================
//     console.log("ORDER ADDRESS DEBUG:", orderAddress);

//     //     // 1️⃣ generate pdf
//     //     const filePath = await generateInvoice({
//     //       order,
//     //       items: orderItems,
//     //       address: orderAddress,
//     //     });
//     // // console.log("INVOICE PATH:", filePath);
//     // await sendInvoiceEmail({
//     //   to: orderAddress.email,
//     //   orderNumber: order.orderNumber,
//     //   filePath,
//     // });
//     // ✅ SEND EMAILS HERE (correct place)
//     await sendInvoiceEmail({
//       orderNumber: order.orderNumber,
//       orderAddress, // must contain email
//       totalAmount: order.totalAmount,
//       // filePath,
//     });

//     // ================= COD RESPONSE =================
//     if (isCOD) {
//       return res.json({
//         success: true,
//         message: "Order placed with Cash on Delivery",
//         orderNumber: order.orderNumber,
//         totalAmount,
//       });
//     }

//     // ================= RAZORPAY =================
//     const razorpayOrder = await razorpay.orders.create({
//       amount: totalAmount * 100,
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


exports.placeOrder = async (req, res) => {
  let t;
 
  try {
    t = await sequelize.transaction();
 
    const userId = req.user.id;
    const { addressId, paymentMethod, buyNow } = req.body;
 
    if (!addressId) throw new Error("Address is required");
 
    const userAddress = await UserAddress.findOne({
      where: { id: addressId, userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
 
    if (!userAddress) throw new Error("Invalid address");
 
    let orderSourceItems = [];
 
    // ================= BUY NOW =================
    if (buyNow) {
      const { productId, variantId, sizeId, quantity } = buyNow;
 
      const product = await Product.findByPk(productId, {
        include: [{ model: ProductPrice, as: "price" }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
 
      const variant = await ProductVariant.findByPk(variantId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
 
      const variantSize = await VariantSize.findByPk(sizeId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
 
      if (!product || !variant || !variantSize)
        throw new Error("Invalid Buy Now product");
 
      orderSourceItems = [
        {
          product,
          variant,
          variantSize,
          quantity,
          productId,
          variantId,
          sizeId,
        },
      ];
    }
    // ================= CART =================
    else {
      orderSourceItems = await CartItem.findAll({
        where: { userId },
        distinct: true, // 👈 Ensures no duplicate rows from joins
        include: [
          {
            model: Product,
            as: "product",
            include: [{ model: ProductPrice, as: "price" }],
          },
          { model: ProductVariant, as: "variant" },
          { model: VariantSize, as: "variantSize" },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
 
      if (!orderSourceItems.length) throw new Error("Cart is empty");
    }
 
    // ================= CALCULATE (PROTECTED LOGIC) =================
    let subtotal = 0;
    let totalTax = 0;
    // క్లౌడ్ సర్వర్లలో Join వల్ల వచ్చే డూప్లికేట్స్ ని ఫిల్టర్ చేయడానికి
    const processedCheck = new Set();
 
    for (const item of orderSourceItems) {
      // Unique identifier for each item
      const itemKey = item.id ? item.id.toString() : `${item.productId}-${item.variantId}-${item.sizeId}`;
      if (processedCheck.has(itemKey)) continue; // ఇప్పటికే కౌంట్ అయితే వదిలేయండి
      processedCheck.add(itemKey);
 
      const price = Number(item.product?.price?.sellingPrice || 0);
      const qty = Number(item.quantity || 0);
      const stock = Number(item.variantSize?.stock || 0);
      const gstRate = Number(item.product?.gstRate || 0);
 
      if (!price || qty <= 0) throw new Error("Invalid order item");
      if (stock < qty)
        throw new Error(`Insufficient stock for ${item.product.title}`);
 
      const itemSubtotal = price * qty;
      const itemTax = Math.round((itemSubtotal * gstRate) / 100);
 
      subtotal += itemSubtotal;
      totalTax += itemTax;
    }
 
    const shippingFee = subtotal > 5000 ? 0 : 150;
    const totalAmount = subtotal + totalTax + shippingFee;
 
    const isCOD = paymentMethod === "COD";
    const otp = generateOtp();
 
    // ================= CREATE ORDER =================
    const order = await Order.create(
      {
        userId,
        orderNumber: generateOrderNumber(),
        subtotal,
        taxAmount: totalTax,
        shippingFee,
        totalAmount: Math.round(totalAmount), // 👈 Rounding for safety
        status: isCOD ? "confirmed" : "pending",
        otp,
        paymentMethod,
        paymentStatus: "unpaid",
      },
      { transaction: t },
    );
 
    // ================= ORDER ITEMS =================
    // Re-calculating based on unique set to match order total
    const orderItems = [];
    const processedItemsForSnapshot = new Set();
 
    for (const item of orderSourceItems) {
      const itemKey = item.id ? item.id.toString() : `${item.productId}-${item.variantId}-${item.sizeId}`;
      if (processedItemsForSnapshot.has(itemKey)) continue;
      processedItemsForSnapshot.add(itemKey);
 
      const price = Number(item.product.price.sellingPrice);
      const qty = Number(item.quantity);
      const gstRate = Number(item.product.gstRate || 0);
 
      const itemSubtotal = price * qty;
      const itemTax = Math.round((itemSubtotal * gstRate) / 100);
 
      orderItems.push({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        sizeId: item.sizeId,
        productName: item.product.title,
        variantColor: item.variant.colorName,
        sizeLabel: item.variantSize.size,
        quantity: qty,
        priceAtPurchase: price,
        taxRate: gstRate,
        taxAmount: itemTax,
        totalPrice: itemSubtotal + itemTax,
      });
    }
 
    await OrderItem.bulkCreate(orderItems, { transaction: t });
 
    // ================= ADDRESS SNAPSHOT =================
    let orderAddress = await OrderAddress.create(
      {
        orderId: order.id,
        fullName: userAddress.fullName,
        email: userAddress.email,
        phoneNumber: userAddress.phoneNumber,
        addressLine: userAddress.addressLine,
        country: userAddress.country,
        city: userAddress.city,
        state: userAddress.state,
        zipCode: userAddress.zipCode,
        latitude: userAddress.latitude,
        longitude: userAddress.longitude,
        placeId: userAddress.placeId,
        formattedAddress:
          userAddress.formattedAddress ||
          `${userAddress.addressLine}, ${userAddress.city}, ${userAddress.state} ${userAddress.zipCode}, ${userAddress.country}`,
      },
      { transaction: t },
    );
 
    // ================= STOCK DEDUCT (COD ONLY) =================
    if (isCOD) {
      for (const item of orderItems) {
        await VariantSize.decrement("stock", {
          by: item.quantity,
          where: { id: item.sizeId },
          transaction: t,
        });
        const remainingStock = await VariantSize.sum("stock", {
          where: { variantId: item.variantId },
          transaction: t,
        });
 
        await ProductVariant.update(
          {
            totalStock: remainingStock,
            stockStatus: remainingStock > 0 ? "In Stock" : "Out of Stock",
          },
          { where: { id: item.variantId }, transaction: t },
        );
      }
 
      if (!buyNow) {
        await CartItem.destroy({ where: { userId }, transaction: t });
      }
    }
 
    await t.commit();
 
    // Send Email
    await sendInvoiceEmail({
      orderNumber: order.orderNumber,
      orderAddress,
      totalAmount: order.totalAmount,
    });
 
    // ================= RESPONSE =================
    if (isCOD) {
      return res.json({
        success: true,
        message: "Order placed with Cash on Delivery",
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
      });
    }
 
    // ================= RAZORPAY (USING CALCULATED TOTAL) =================
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // convert to paisa and ensure integer
      currency: "INR",
      receipt: order.orderNumber,
    });
 
    return res.json({
      success: true,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
 
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

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








