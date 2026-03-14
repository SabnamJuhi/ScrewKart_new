const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/order.controller");
const { protected } = require("../../middleware/user.logout.middleware");
const {updateOrderStatus, markOutForDelivery} = require("../../controllers/adminUpdateOrderStatusApi/updateOrderStatus.controller");
const {sendDeliveryOtp} = require("../../controllers/adminUpdateOrderStatusApi/sendDeliveryOtp.controller");
// const { verifyDeliveryOtp} = require("../../controllers/ADMIN-Update Order Status API/verifyDeliveryOtp.controller");
const {getActiveOrders} = require("../../controllers/userMyOrdersApi/getActiveOrders.controller");
const {getCompletedOrders} = require("../../controllers/userMyOrdersApi/getCompletedOrders.controller");
const {cancelOrder} = require("../../controllers/userMyOrdersApi/cancelOrder.controller");
const {returnOrder} = require("../../controllers/userMyOrdersApi/returnOrder.controller");
const {completeRefund} = require("../../controllers/adminUpdateOrderStatusApi/completeRefund.controller");
const {markDeliveredCOD} = require("../../controllers/codDeliveryPaymentCompletionApis/markDeliveredCOD.controller");
const {collectCODPayment} = require("../../controllers/codDeliveryPaymentCompletionApis/collectCODPayment.controller");
const {getAdminActiveOrders} = require("../../controllers/adminGetOrdersHistory/getAdminActiveOrders.controller");
const {getAdminOrderHistory} = require("../../controllers/adminGetOrdersHistory/getAdminOrderHistory.controller");
const { getOrderHistory} = require("../../controllers/userMyOrdersApi/getOrderHistory.controller");
const {addAddress,getUserAddresses,updateAddress,deleteAddress,setDefaultAddress,getAddressById} = require("../../controllers/order/address.crud.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");
// const {createDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy, } = require("../../controllers/order/deliveryBoy.CRUD.controller");
// const {confirmCodPayment} = require("../../controllers/ADMIN-Update Order Status API/confirmCodPayment.controller");
const {getMyAssignedOrders, loginDeliveryBoy, getAllDeliveryBoys, registerDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy, verifyDeliveryOtp, confirmCodPayment} = require("../../controllers/deliveryBoy/deliveryBoy.controller");
const {deliveryBoyAuth} = require("../../middleware/deliveryBoy.Auth.middleware");
const { getAddressWithGoogleLink } = require("../../controllers/order/google.address.controller");


// Create Order (Requires Login)
router.post("/place", protected, orderController.placeOrder);
router.post("/verifyPayment", protected, orderController.verifyRazorpayPayment,);

// Payment Webhook (Public, called by Razorpay/Stripe)
// router.post('/webhook/payment', orderController.handlePaymentWebhook);

// router.post("/payment/icici/callback", orderController.iciciReturn);
// router.post("/payment/icici/test", orderController.iciciTestCallback);


// --- Delivery Boy Auth ---
router.post("/register", adminAuthMiddleware, registerDeliveryBoy);
router.post("/login", loginDeliveryBoy);
router.get("/deliveryBoys", adminAuthMiddleware, getAllDeliveryBoys);
router.patch("/deliveryBoys/:id", adminAuthMiddleware, updateDeliveryBoy);
router.delete("/deliveryBoys/:id",adminAuthMiddleware, deleteDeliveryBoy);
router.patch("/:orderNumber/shipped", adminAuthMiddleware, updateOrderStatus);
router.patch("/:orderNumber/outForDelivery", adminAuthMiddleware, markOutForDelivery);
// --- Orders assigned to delivery boy ---
router.get("/myOrders", deliveryBoyAuth, getMyAssignedOrders);
// --- OTP Verification ---
router.post("/verifyOtp", deliveryBoyAuth, verifyDeliveryOtp);
// --- COD payment confirmation ---
router.post("/confirmCodPayment", deliveryBoyAuth, confirmCodPayment);

//ADMIN — Update Order Status API
// router.patch("/admin/:orderNumber/status", updateOrderStatus);
// router.post("/admin/:orderNumber/send-otp", adminAuthMiddleware, sendDeliveryOtp);
// router.post("/admin/verify-delivery-otp", verifyDeliveryOtp);
// router.patch("/admin/confirm-cod-payment", confirmCodPayment);



//USER — My Orders API
router.get("/active", protected, getActiveOrders);
router.get("/completed", protected, getCompletedOrders);
router.get("/history", protected, getOrderHistory);

//cancel/return
router.post("/:orderNumber/cancel", protected, cancelOrder);
router.post("/:orderNumber/return", returnOrder);
router.post("/admin/:orderNumber/refund", completeRefund);

// COD flow
router.patch("/admin/:orderNumber/markDelivered", markDeliveredCOD);
router.patch("/admin/:orderNumber/collectCod", collectCODPayment);

//Admin-get-Orders
// ADMIN — Orders viewing
router.get("/admin/active", adminAuthMiddleware, getAdminActiveOrders);
router.get("/admin/history", adminAuthMiddleware, getAdminOrderHistory);

//Adress APIS
router.post("/user/address", protected, addAddress);
router.get("/user/address", protected, getUserAddresses);
router.get("/user/address/:id", protected, getAddressById);
router.put("/user/address/:id", protected, updateAddress);
router.delete("/user/address/:id", protected, deleteAddress);
router.patch("/user/address/default/:id", protected, setDefaultAddress);


//Google address APIS
// Add new address
router.post("/gLocation", protected, addAddress);
// Update full address OR add google location later
router.put("/gLocation/:id", protected, updateAddress);
// Get single adress with Google Maps link
router.get("/gLocation/:id/google", protected, getAddressWithGoogleLink);


// router.post(
//   "/razorpay-webhook",
//   express.raw({ type: "application/json" }),
//   razorpayWebhook
// );
router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
   orderController.razorpayWebhook
  // orderController.handleRefundProcessed,
  // orderController.handlePaymentFailed,
  // orderController.handlePaymentFailed
);

module.exports = router;

// 1. User creates order → status: pending, paymentStatus: unpaid
// 2. ICICI success → status: confirmed, paymentStatus: paid
// 3. Admin ships → status: shipped
// 4. Delivered → status: delivered + OTP sent
// 5. OTP verified → status: completed
