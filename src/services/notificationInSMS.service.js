

const OrderAddress = require("../models/orders/orderAddress.model");
const { sendSMS } = require("../utils/sms");

const sendOrderNotification = async (order, type) => {
  try {

    console.log("🚀 SMS FUNCTION CALLED");

    const address = await OrderAddress.findOne({
      where: { orderId: order.id }
    });

    console.log("📱 ADDRESS:", address?.phoneNumber);

    if (!address?.phoneNumber) {
      console.log("❌ PHONE NUMBER NOT FOUND");
      return;
    }

    let templateId;
    let variables = {};

    switch (type) {

      case "COD_CONFIRMED":
        templateId = process.env.MSG91_TEMPLATE_COD;

        variables = {
          var: order.orderNumber
        };

        break;

      case "ONLINE_CONFIRMED":
        templateId = process.env.MSG91_TEMPLATE_PAID;

        variables = {
          var: order.orderNumber
        };

        break;

      case "ORDER_COMPLETED":
        templateId = process.env.MSG91_TEMPLATE_COMPLETED;

        variables = {
          var: order.orderNumber
        };

        break;
    }

    console.log("📦 TEMPLATE:", templateId);
    console.log("📦 VARIABLES:", variables);

    const response = await sendSMS({
      mobile: address.phoneNumber,
      templateId,
      variables
    });

    console.log("✅ SMS RESPONSE:", response);

  } catch (error) {
    console.error("❌ SMS SERVICE ERROR:", error);
  }
};

module.exports = { sendOrderNotification };