// const { Order } = require("../../models");

// exports.getActiveOrders = async (req, res) => {
// const orders = await Order.findAll({
// where: {
// userId: req.user.id,
// status: ["confirmed", "packed", "shipped", "out_for_delivery"],
// },
// order: [["createdAt", "DESC"]],
// });

// res.json({ success: true, data: orders });
// };

// const {
//   Order,
//   OrderAddress,
//   OrderItem,
//   Product,
//   ProductPrice,
//   ProductVariant,
//   VariantImage,
//   VariantSize,
// } = require("../../models");

// exports.getActiveOrders = async (req, res) => {
//   try {
//     const orders = await Order.findAll({
//       where: {
//         userId: req.user.id,
//         status: ["confirmed", "packed", "shipped", "out_for_delivery"],
//       },
//       include: [
//         {
//           model: OrderAddress,
//           as: "address",
//         },
//         {
//           model: OrderItem,
//           include: [
//             {
//               model: Product,
//               include: [{ model: ProductPrice, as: "price" }],
//             },
//             {
//               model: ProductVariant,
//               include: [{ model: VariantImage, as: "images", limit: 1 }],
//             },
//             {
//               model: VariantSize,
//             },
//           ],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     // 🔹 Format response same as admin API
//     const formattedOrders = orders.map((order) => {
//       const items = order.OrderItems.map((item) => {
//         const sellingPrice = item.Product?.price?.sellingPrice || 0;

//         return {
//           orderItemId: item.id,
//           productId: item.productId,
//           title: item.Product?.title || "Unknown Product",
//           image: item.ProductVariant?.images?.[0]?.imageUrl || null,

//           variant: {
//             color: item.ProductVariant?.colorName,
//             size: item.VariantSize?.size,
//           },

//           price: sellingPrice,
//           quantity: item.quantity,
//           total: sellingPrice * item.quantity,
//         };
//       });

//       return {
//         orderId: order.id,
//         orderNumber: order.orderNumber,
//         status: order.status,
//         createdAt: order.createdAt,

//         address: order.address,

//         items,
//       };
//     });

//     res.json({
//       success: true,
//       total: formattedOrders.length,
//       data: formattedOrders,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

const {
  Order,
  OrderAddress,
  OrderItem,
  Product,
  ProductPrice,
  ProductVariant,
  VariantImage,
  VariantSize,
} = require("../../models");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.getActiveOrders = async (req, res) => {
  try {
    const paginationOptions = getPaginationOptions(req.query);
    const orders = await Order.findAndCountAll({
      where: {
        userId: req.user.id,
        status: ["confirmed", "packed", "shipped", "out_for_delivery"],
      },
      include: [
        {
          model: OrderAddress,
          as: "address",
        },
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ["id", "title", "sku"],
              include: [{ model: ProductPrice, as: "price" }],
            },
            {
              model: ProductVariant,
              include: [{ model: VariantImage, as: "images", limit: 1 }],
            },
            {
              model: VariantSize,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      distinct: true,
      ...paginationOptions,
    });

    // Format response SAME as admin APIs
    const formattedOrders = orders.rows.map((order) => {
      const items = order.OrderItems.map((item) => {
        const sellingPrice = item.Product?.price?.sellingPrice || 0;

        return {
          orderItemId: item.id,
          productId: item.productId,
          title: item.Product?.title || "Unknown Product",
          image: item.ProductVariant?.images?.[0]?.imageUrl || null,

          variant: {
            color: item.ProductVariant?.colorName || null,
            length: item.VariantSize?.length || null,
            diameter: item.VariantSize?.diameter || null,
          },

          price: sellingPrice,
          quantity: item.quantity,
          total: sellingPrice * item.quantity,
        };
      });

      return {
        // FULL ORDER TABLE DETAILS
        orderDetails: {
          id: order.id,
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,

          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          transactionId: order.transactionId,

          deliveryOtp: order.deliveryOtp,
          otpVerified: order.otpVerified,
          otp: order.otp,
          confirmedAt: order.confirmedAt,
          shippedAt: order.shippedAt,
          deliveredAt: order.deliveredAt,
          completedAt: order.completedAt,
          cancelledAt: order.cancelledAt,
          refundedAt: order.refundedAt,

          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          userId: order.userId,
        },

        // ADDRESS SNAPSHOT
        address: order.address,
        //  ITEMS
        items,
      };
    });
    /* 🔹 Format Pagination */
    const response = formatPagination(
      {
        count: orders.count,
        rows: formattedOrders,
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
