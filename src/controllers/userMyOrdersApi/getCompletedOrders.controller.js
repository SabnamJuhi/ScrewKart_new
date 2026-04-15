
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
// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

// exports.getCompletedOrders = async (req, res) => {
//   try {
//       const paginationOptions = getPaginationOptions(req.query);
//     const orders = await Order.findAndCountAll({
//       where: {
//         userId: req.user.id,
//         status: "completed",
//       },
//       include: [
//         {
//           model: User,
//           attributes: ["id", "userName", "email"],
//         },
//         {
//           model: OrderAddress,
//           as: "address",
//         },
//         {
//           model: OrderItem,
//           include: [
//             {
//               model: Product,
//                attributes: ["id", "title", "sku"],
//               include: [{ model: ProductPrice, as: "price" }],
//             },
//             {
//               model: ProductVariant,
//               attributes: ["id", "colorName"],
//               include: [{ model: VariantImage, as: "images", limit: 1 }],
//             },
//             {
//               model: VariantSize,
//               attributes: ["id", "length", "diameter"],
//             },
//           ],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//        distinct: true,
//       ...paginationOptions,
//     });

//     const formattedOrders = orders.rows.map((order) => {
//       const items = order.OrderItems.map((item) => {
//         const price = item.Product?.price?.sellingPrice || 0;

//         return {
//           orderItemId: item.id,
//           productId: item.productId,
//           title: item.Product?.title || "Unknown Product",
//           image: item.ProductVariant?.images?.[0]?.imageUrl || null,

//           variant: {
//             color: item.ProductVariant?.colorName || null,
//             size: item.VariantSize?.size || null,
//           },

//           price,
//           quantity: item.quantity,
//           total: price * item.quantity,
//         };
//       });

//       return {
//         // 🔹 FULL ORDER TABLE DATA
//         orderDetails: {
//           id: order.id,
//           orderNumber: order.orderNumber,
//           subtotal: order.subtotal,
//           shippingFee: order.shippingFee,
//           taxAmount: order.taxAmount,
//           totalAmount: order.totalAmount,

//           status: order.status,
//           paymentStatus: order.paymentStatus,
//           paymentMethod: order.paymentMethod,
//           transactionId: order.transactionId,

//           deliveryOtp: order.deliveryOtp,
//           otpVerified: order.otpVerified,

//           confirmedAt: order.confirmedAt,
//           shippedAt: order.shippedAt,
//           deliveredAt: order.deliveredAt,
//           completedAt: order.completedAt,
//           cancelledAt: order.cancelledAt,
//           refundedAt: order.refundedAt,

//           createdAt: order.createdAt,
//           updatedAt: order.updatedAt,
//           userId: order.userId,
//         },

//         // 🔹 CUSTOMER INFO
//         customer: {
//           id: order.User?.id,
//           name: order.User?.userName,
//           email: order.User?.email,
//         },

//         // 🔹 ADDRESS
//         address: order.address || null,

//         // 🔹 ITEMS
//         items,
//       };
//     });
//  const response = formatPagination(
//       {
//         count: orders.count,
//         rows: formattedOrders,
//       },
//       paginationOptions.currentPage,
//       paginationOptions.limit
//     );

//     return res.json({
//       success: true,
//       ...response,
//     });

//   } catch (err) {
//     return res.status(500).json({
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
  Store,
} = require("../../models");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");
const { Op } = require("sequelize");





/**
 * USER: Get completed orders (specifically 'completed' status)
 * This is a more specific version of order history
 */
exports.getCompletedOrders = async (req, res) => {
  try {
    const paginationOptions = getPaginationOptions(req.query);
    const userId = req.user.id;
    
    const orders = await Order.findAndCountAll({
      where: {
        userId: userId,
        status: "completed",
      },
      include: [
        {
          model: Store,
          as: "store",
          required: false,
          attributes: ["id", "name", "latitude", "longitude", "avgDeliveryTime"]
        },
        {
          model: User,
          attributes: ["id", "userName", "email", "mobileNumber"],
        },
        {
          model: OrderAddress,
          as: "address",
        },
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ["id", "title", "sku", "description"],
            },
            {
              model: ProductVariant,
              include: [{ model: VariantImage, as: "images", limit: 1 }, { model: ProductPrice, as: "price" }],
            },
            {
              model: VariantSize,
              attributes: ["id", "length", "diameter", "approxWeightKg"],
            },
          ],
        },
      ],
      order: [["completedAt", "DESC"], ["createdAt", "DESC"]],
      distinct: true,
      ...paginationOptions,
    });

    const formattedOrders = orders.rows.map((order) => {
      const items = order.OrderItems.map((item) => {
        const sellingPrice = item.finalPerUnit || 
                            item.Product?.price?.sellingPrice || 
                            item.basePrice || 0;
        
        return {
          orderItemId: item.id,
          productId: item.productId,
          productName: item.productName,
          title: item.Product?.title || item.productName || "Unknown Product",
          sku: item.Product?.sku,
          image: item.ProductVariant?.images?.[0]?.imageUrl || null,
          
          variant: {
            id: item.variantId,
            color: item.ProductVariant?.colorName || null,
            code: item.ProductVariant?.variantCode,
            unit: item.ProductVariant?.unit,
            length: item.VariantSize?.length || null,
            diameter: item.VariantSize?.diameter || null,
            weight: item.VariantSize?.approxWeightKg,
          },
          
          price: {
            basePrice: item.basePrice,
            gstRate: item.gstRate,
            gstPerUnit: item.gstPerUnit,
            finalPerUnit: item.finalPerUnit,
            sellingPrice: sellingPrice
          },
          
          quantity: item.quantity,
          totals: {
            subTotal: item.subTotal,
            taxTotal: item.taxTotal,
            totalPrice: item.totalPrice
          }
        };
      });
      
      return {
        /**
         * ORDER SUMMARY
         */
        orderSummary: {
          id: order.id,
          orderNumber: order.orderNumber,
          storeId: order.storeId,
          storeName: order.store?.name || `Store ${order.storeId}`,
          status: order.status,
          statusInfo: {
            label: 'Completed',
            color: 'success',
            icon: 'check-circle',
            type: 'positive'
          },
          deliveryType: order.deliveryType,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
          completedAt: order.completedAt,
        },
        
        /**
         * FULL ORDER DETAILS
         */
        orderDetails: {
          id: order.id,
          orderNumber: order.orderNumber,
          storeId: order.storeId,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          transactionId: order.transactionId,
          
          deliveryType: order.deliveryType,
          invoiceUrl: order.invoiceUrl,
          invoiceStatus: order.invoiceStatus,
          
          // Timeline tracking
          confirmedAt: order.confirmedAt,
          pickingAt: order.pickingAt,
          packedAt: order.packedAt,
          shippedAt: order.shippedAt,
          dispatchedAt: order.dispatchedAt,
          outForDeliveryAt: order.outForDeliveryAt,
          deliveredAt: order.deliveredAt,
          completedAt: order.completedAt,
          
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          userId: order.userId,
        },
        
        /**
         * CUSTOMER INFORMATION
         */
        customer: {
          id: order.User?.id,
          name: order.User?.userName,
          email: order.User?.email,
          mobile: order.User?.mobileNumber,
        },
        
        /**
         * STORE INFORMATION
         */
        store: order.store ? {
          id: order.store.id,
          name: order.store.name,
          location: {
            latitude: order.store.latitude,
            longitude: order.store.longitude
          }
        } : null,
        
        /**
         * SHIPPING ADDRESS
         */
        address: order.address ? {
          id: order.address.id,
          fullName: order.address.fullName,
          email: order.address.email,
          phoneNumber: order.address.phoneNumber,
          addressLine: order.address.addressLine,
          house: order.address.house,
          city: order.address.city,
          state: order.address.state,
          zipCode: order.address.zipCode,
          country: order.address.country,
          formattedAddress: order.address.formattedAddress,
          googleMapsLink: order.address.googleMapsLink,
        } : null,
        
        /**
         * ORDER ITEMS
         */
        items,
        
        /**
         * PAYMENT SUMMARY
         */
        paymentSummary: {
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
        },
        
        /**
         * TIMELINE
         */
        timeline: {
          orderPlaced: order.createdAt,
          confirmed: order.confirmedAt,
          processing: order.pickingAt || order.packedAt,
          shipped: order.shippedAt || order.dispatchedAt,
          outForDelivery: order.outForDeliveryAt,
          delivered: order.deliveredAt,
          completed: order.completedAt
        },
        
        /**
         * USER ACTIONS
         */
        actions: {
          canReorder: true,
          canViewInvoice: !!order.invoiceUrl,
          canWriteReview: true,
        }
      };
    });
    
    // Calculate summary for completed orders
    const summary = {
      totalCompletedOrders: orders.count,
      totalSpent: 0,
      averageOrderValue: 0
    };
    
    let totalSpentSum = 0;
    formattedOrders.forEach(order => {
      totalSpentSum += parseFloat(order.orderDetails.totalAmount || 0);
    });
    
    summary.totalSpent = totalSpentSum;
    summary.averageOrderValue = orders.count > 0 ? totalSpentSum / orders.count : 0;
    
    const response = formatPagination(
      {
        count: orders.count,
        rows: formattedOrders,
      },
      paginationOptions.currentPage,
      paginationOptions.limit
    );

    return res.json({
      success: true,
      summary: summary,
      ...response,
    });

  } catch (err) {
    console.error("Get completed orders error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

