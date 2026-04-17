const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/order.controller");
const { protected } = require("../../middleware/user.logout.middleware");

const {getActiveOrders} = require("../../controllers/userMyOrdersApi/getActiveOrders.controller");
const {getCancelledOrders} = require("../../controllers/userMyOrdersApi/getCancelOrder.controller")
const {getCompletedOrders} = require("../../controllers/userMyOrdersApi/getCompletedOrders.controller");
const {cancelOrder, cancelPickupOrder, adminCancelOrder} = require("../../controllers/order/cancelOrder.controller");
const {returnOrder} = require("../../controllers/userMyOrdersApi/returnOrder.controller");
const {completeRefund} = require("../../controllers/adminUpdateOrderStatusApi/completeRefund.controller");

const {getAdminActiveOrders} = require("../../controllers/adminGetOrdersHistory/getAdminActiveOrders.controller");
const {getAdminOrderHistory} = require("../../controllers/adminGetOrdersHistory/getAdminOrderHistory.controller");
const { getOrderHistory} = require("../../controllers/userMyOrdersApi/getOrderHistory.controller");
const {addAddress,getUserAddresses,updateAddress,deleteAddress,setDefaultAddress,getAddressById} = require("../../controllers/order/address.crud.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");

const { loginDeliveryBoy, getAllDeliveryBoys, registerDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy, } = require("../../controllers/deliveryBoy/deliveryBoy.controller");
const { getAddressWithGoogleLink } = require("../../controllers/order/google.address.controller");
const { allowAdminRoles } = require("../../middleware/admin.role.middleware");
const { checkStoreAccess } = require("../../middleware/storeAccess.middleware");
const uploadDeliveryBoyDocsMiddleware = require("../../middleware/uploadDeliveryBoyDocs.middleware");










// Create Order (Requires Login)
router.post("/place", protected, orderController.placeOrder);
router.post("/verifyPayment", protected, orderController.verifyRazorpayPayment,);



// --- Delivery Boy Auth ---
router.post("/register", adminAuthMiddleware, uploadDeliveryBoyDocsMiddleware, registerDeliveryBoy);
router.post("/login", loginDeliveryBoy);
router.get("/deliveryBoys", adminAuthMiddleware, getAllDeliveryBoys);
router.patch("/deliveryBoys/:id", adminAuthMiddleware, uploadDeliveryBoyDocsMiddleware, updateDeliveryBoy);
router.delete("/deliveryBoys/:id",adminAuthMiddleware, deleteDeliveryBoy);




//USER — My Orders API
router.get("/active", protected, getActiveOrders);
router.get("/completed", protected, getCompletedOrders);
router.get("/history", protected, getOrderHistory);
router.get("/canceled", protected, getCancelledOrders)

//cancel/return
router.post("/:orderNumber/cancel", protected, cancelOrder);
router.post("/:orderNumber/return", returnOrder);
router.post("/admin/:orderNumber/refund", completeRefund);
//cancel order by pickup customer
router.post("/:orderNumber/cancelForPickup", cancelPickupOrder)

//Cancel order by Admin
router.post("/:orderNumber/cancelByAdmin", adminAuthMiddleware, allowAdminRoles("superAdmin", "storeAdmin"), checkStoreAccess, adminCancelOrder)



//Admin-get-Orders
// ADMIN — Orders viewing
router.get("/admin/active", adminAuthMiddleware, allowAdminRoles("superAdmin", "storeAdmin"), getAdminActiveOrders);
router.get("/admin/history", adminAuthMiddleware, allowAdminRoles("superAdmin", "storeAdmin"), getAdminOrderHistory);

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
