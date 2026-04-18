




const { sendSMS } = require("../utils/sms");

const sendOrderNotification = async (order, type) => {
  try {
    let templateId;
    let variables = {};

    switch (type) {

      case "COD_CONFIRMED":
        templateId = process.env.MSG91_TEMPLATE_COD;
        variables = {
          VAR1: order.orderNumber
        };
        break;

      case "ONLINE_CONFIRMED":
        templateId = process.env.MSG91_TEMPLATE_PAID;
        variables = {
          VAR1: order.orderNumber
        };
        break;

      case "ORDER_COMPLETED":
        templateId = process.env.MSG91_TEMPLATE_COMPLETED;
        variables = {
          VAR1: order.orderNumber
        };
        break;

      default:
        throw new Error("Invalid notification type");
    }

    await sendSMS({
      mobile: order.mobileNumber,
      templateId,
      variables
    });

  } catch (error) {
    console.error("Notification Error:", error.message);
  }
};

module.exports = { sendOrderNotification };