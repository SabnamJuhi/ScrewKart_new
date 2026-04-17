const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// exports.createPaymentLink = async ({ order, user }) => {
//   return await razorpay.paymentLink.create({
//     amount: order.totalAmount * 100, // paise
//     currency: "INR",
//     description: `COD Payment for Order #${order.orderNumber}`,

//     customer: {
//       name: user.name,
//       email: user.email,
//       contact: user.mobile,
//     },

//     notify: {
//       sms: true,
//       email: true,
//     },

//     reminder_enable: true,

//     notes: {
//       orderId: order.id,
//       orderNumber: order.orderNumber,
//     },

//     callback_url: `${process.env.FRONTEND_URL}/payment-success`,
//     callback_method: "get",
//   });
// };





exports.createDynamicQR = async ({ order }) => {
  return await razorpay.qrCode.create({
    type: "upi_qr",
    name: `Order_${order.orderNumber}`,

    usage: "single_use", // ✅ one-time payment
    fixed_amount: true,

    payment_amount: order.totalAmount * 100, // paise

    description: `Payment for Order ${order.orderNumber}`,

   notes: {
  orderNumber: order.orderNumber,
}
  });
};