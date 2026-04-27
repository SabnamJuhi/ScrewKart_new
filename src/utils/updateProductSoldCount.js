 const { OrderItem, Product } = require("../models");



// async function updateProductSoldCount(orderId) {
//   try {
//     const orderItems = await OrderItem.findAll({
//       where: { orderId },
//       attributes: ["productId", "quantity"],
//     });

//     for (const item of orderItems) {
//       await Product.increment("soldCount", {
//         by: item.quantity,
//         where: { id: item.productId },
//       });
//     }

//     console.log("✅ Product soldCount updated for order:", orderId);
//   } catch (err) {
//     console.error("❌ Error updating soldCount:", err.message);
//   }
// }



async function updateProductSoldCount(orderId, transaction = null) {
  try {
    const orderItems = await OrderItem.findAll({
      where: { orderId },
      attributes: ["productId", "quantity"],
      transaction,
    });

    console.log("🟡 Updating soldCount for items:", orderItems.length);

    for (const item of orderItems) {
      const result = await Product.increment("soldCount", {
        by: item.quantity,
        where: { id: item.productId },
        transaction,
      });

      console.log(
        `✅ Product ${item.productId} soldCount +${item.quantity}`,
        result
      );
    }

    return { success: true, count: orderItems.length };

  } catch (err) {
    console.error("❌ SOLD COUNT ERROR:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = updateProductSoldCount;