const { Order, User } = require("../../models");
const razorpayService = require("../../services/razorpay.service");
const crypto = require("crypto");

exports.generateCODQR = async (req, res) => {
  try {
    // const { orderId } = req.body;
    const { orderNumber } = req.body;
console.log("Incoming orderNumber:", orderNumber);
   console.log("Incoming orderNumber:", orderNumber);

    const order = await Order.findOne({
  where: { orderNumber }
});
    console.log("Order from DB:", order);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.deliveryBoyId !== req.deliveryBoy.id) {
      return res.status(403).json({
        success: false,
        message: "Not assigned to this order",
      });
    }

    // ✅ Validate COD
    if (order.paymentMethod !== "COD") {
      return res.status(400).json({
        success: false,
        message: "Only COD orders allowed",
      });
    }

    if (order.status !== "out_for_delivery") {
      return res.status(400).json({
        success: false,
        message: "QR can only be generated when order is out for delivery",
      });
    }

    // ✅ Already paid check
    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order already paid",
      });
    }

    // ✅ Prevent duplicate QR
    if (order.razorpayQrUrl) {
      return res.json({
        success: true,
        data: {
          qrCode: order.razorpayQrUrl,
        },
      });
    }

    const user = await User.findByPk(order.userId);

    // const paymentLink = await razorpayService.createPaymentLink({
    //   order,
    //   user,
    // });
    const qr = await razorpayService.createDynamicQR({ order });

    // // ✅ Save QR + link
    // await order.update({
    //   razorpayLinkId: paymentLink.id,
    //   razorpayQrUrl: paymentLink.qr_code,
    //   paymentStatus: "unpaid",
    // });
    await order.update({
      razorpayQrId: qr.id,
      razorpayQrUrl: qr.image_url,
      paymentStatus: "unpaid",
    });

    return res.json({
      success: true,
      data: {
        qrCode: qr.image_url, // 🔥 PURE QR IMAGE
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "QR generation failed",
    });
  }
};

// exports.verifyCODPayment = async (req, res) => {
//   try {
//     const { paymentId, paymentLinkId, status, signature } = req.body;

//     // 1. Basic validation
//     if (!paymentId || !paymentLinkId) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing payment details",
//       });
//     }

//     // 2. Verify signature (IMPORTANT)
//     const body = paymentLinkId + "|" + paymentId;

//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(body)
//       .digest("hex");

//     if (expectedSignature !== signature) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment signature",
//       });
//     }

//     // 3. Find order using paymentLinkId
//     const order = await Order.findOne({
//       where: { razorpayLinkId: paymentLinkId },
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order not found",
//       });
//     }

//     // 4. Prevent duplicate update
//     if (order.paymentStatus === "paid") {
//       return res.json({
//         success: true,
//         message: "Already paid",
//       });
//     }

//     // 5. Update order
//     await order.update({
//       paymentStatus: "paid",
//       paymentId: paymentId,
//     });

//     res.json({
//       success: true,
//       message: "Payment verified successfully",
//     });
//   } catch (error) {
//     console.error("Verify COD Payment Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Payment verification failed",
//     });
//   }
// };
