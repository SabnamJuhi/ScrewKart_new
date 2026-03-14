// const { Order, OrderAddress, OrderItem, User } = require("../../models");

// exports.getAdminActiveOrders = async (req, res) => {
//   try {
//     const orders = await Order.findAll({
//       where: {
//         status: ["confirmed", "packed", "shipped", "out_for_delivery"],
//       },
//       include: [
//         {
//           model: OrderAddress,
//           as: "address", // ✅ REQUIRED alias
//         },
//         {
//           model: OrderItem,
//         },
//         {
//           model: User,
//           attributes: ["id", "userName", "email"],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     res.json({
//       success: true,
//       total: orders.length,
//       data: orders,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// const {
//   Order,
//   OrderAddress,
//   OrderItem,
//   User,
//   Product,
//   ProductPrice,
//   ProductVariant,
//   VariantImage,
//   VariantSize,
// } = require("../../models");

// exports.getAdminActiveOrders = async (req, res) => {
//   try {
//     const orders = await Order.findAll({
//       where: {
//         status: ["confirmed", "packed", "shipped", "out_for_delivery"],
//       },
//       include: [
//         {
//           model: OrderAddress,
//           as: "address",
//         },
//         {
//           model: User,
//           attributes: ["id", "userName", "email"],
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

//     // 🔹 Transform response like cart structure
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

//         customer: {
//           id: order.User?.id,
//           name: order.User?.userName,
//           email: order.User?.email,
//         },

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
  User,
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

exports.getAdminActiveOrders = async (req, res) => {
  // 🔹 Get pagination options from query
  const paginationOptions = getPaginationOptions(req.query);
  try {
    const orders = await Order.findAndCountAll({
      where: {
        status: ["confirmed", "packed", "shipped", "out_for_delivery"],
      },
      include: [
        {
          model: OrderAddress,
          as: "address",
        },
        {
          model: User,
          attributes: ["id", "userName", "email"],
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
      // order: [["createdAt", "DESC"]],
      distinct: true, // 🔥 VERY IMPORTANT (prevents wrong count with include)
      ...paginationOptions,
    });

    /**
     * 🔹 Transform response
     */
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
        /**
         * 🆕 FULL ORDER TABLE DETAILS
         */
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
        customer: {
          id: order.User?.id,
          name: order.User?.userName,
          email: order.User?.email,
        },
        address: order.address,
        items,
      };
    });
    // 🔹 Format final response with pagination metadata
    const response = formatPagination(
      { count: orders.count, rows: formattedOrders },
      paginationOptions.currentPage,
      paginationOptions.limit,
    );

    res.json({
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
