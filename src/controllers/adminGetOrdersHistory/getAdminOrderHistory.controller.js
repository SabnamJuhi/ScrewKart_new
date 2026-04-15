
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

// exports.getAdminOrderHistory = async (req, res) => {
//   try {
//     const paginationOptions = getPaginationOptions(req.query);
//     const orders = await Order.findAndCountAll({
//       where: {
//         status: ["delivered", "completed", "cancelled", "refunded"],
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
//               attributes: ["id", "title", "sku"],
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
//       // order: [["createdAt", "DESC"]],
//       distinct: true, // 🔥 VERY IMPORTANT with includes
//       ...paginationOptions,
//     });

//     /**
//      * 🔹 Transform response (same structure as Active Orders)
//      */
//     const formattedOrders = orders.rows.map((order) => {
//       const items = order.OrderItems.map((item) => {
//         const sellingPrice = item.Product?.price?.sellingPrice || 0;

//         return {
//           orderItemId: item.id,
//           productId: item.productId,
//           title: item.Product?.title || "Unknown Product",
//           image: item.ProductVariant?.images?.[0]?.imageUrl || null,

//           variant: {
//             color: item.ProductVariant?.colorName || null,
//             length: item.VariantSize?.length || null,
//             diameter: item.VariantSize?.diameter || null,
//           },

//           price: sellingPrice,
//           quantity: item.quantity,
//           total: sellingPrice * item.quantity,
//         };
//       });

//       return {
//         /**
//          * 🆕 FULL ORDER TABLE DETAILS
//          */
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
//         customer: {
//           id: order.User?.id,
//           name: order.User?.userName,
//           email: order.User?.email,
//         },
//         address: order.address,
//         items,
//       };
//     });
//     const response = formatPagination(
//       { count: orders.count, rows: formattedOrders },
//       paginationOptions.currentPage,
//       paginationOptions.limit,
//     );
//     res.json({
//       success: true,
//       ...response,
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
  Store,
} = require("../../models");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");
const { Op } = require("sequelize");

/**
 * ADMIN: Get order history (completed, delivered, cancelled, returned orders)
 * Supports both superAdmin and storeAdmin with store filtering
 */
exports.getAdminOrderHistory = async (req, res) => {
  try {
    // Get pagination options from query
    const paginationOptions = getPaginationOptions(req.query);
    
    // Get store filter from query params
    const { storeId: queryStoreId } = req.query;
    const admin = req.admin;
    
    // Build store filter condition
    let storeCondition = {};
    
    if (admin.role === "superAdmin") {
      // Super admin can filter by storeId if provided, otherwise get all stores
      if (queryStoreId) {
        storeCondition.storeId = parseInt(queryStoreId);
      }
    } else if (admin.role === "storeAdmin") {
      // Store admin can only see their own store
      storeCondition.storeId = admin.storeId;
    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid role for accessing orders"
      });
    }
    
    // Define history statuses (terminal states)
    const historyStatuses = [
      "delivered",
      "completed", 
      "cancelled",
      "returned",
      "refunded"
    ];
    
    // Fetch orders with filters
    const orders = await Order.findAndCountAll({
      where: {
        ...storeCondition,
        status: {
          [Op.in]: historyStatuses
        }
      },
      include: [
        {
          model: Store,
          as: "store",
          attributes: ["id", "name", "latitude", "longitude", "deliveryRadius", "isActive", "openTime", "closeTime", "avgDeliveryTime"]
        },
        {
          model: OrderAddress,
          as: "address",
        },
        {
          model: User,
          attributes: ["id", "userName", "email", "mobileNumber"],
        },
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ["id", "title", "sku"],
            },
            {
              model: ProductVariant,
              include: [
                { 
                  model: VariantImage, 
                  as: "images", 
                  limit: 1 
                },
                { model: ProductPrice, as: "price" }
              ],
            },
            {
              model: VariantSize,
            },
          ],
        },
      ],
      order: [["completedAt", "DESC"], ["deliveredAt", "DESC"], ["createdAt", "DESC"]],
      distinct: true,
      ...paginationOptions,
    });
    
    /**
     * Transform response with enhanced order details
     */
    const formattedOrders = orders.rows.map((order) => {
      // Transform order items
      const items = order.OrderItems.map((item) => {
        const sellingPrice = item.finalPerUnit || 
                            item.ProductVariant?.price?.sellingPrice || 
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
            length: item.VariantSize?.length || null,
            diameter: item.VariantSize?.diameter || null,
            ...(item.variantInfo && { info: item.variantInfo })
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
      
      // Get completion date based on status
      const getCompletionDate = (order) => {
        switch(order.status) {
          case 'delivered':
            return order.deliveredAt;
          case 'completed':
            return order.completedAt;
          case 'cancelled':
            return order.cancelledAt;
          case 'returned':
          case 'refunded':
            return order.refundedAt;
          default:
            return order.updatedAt;
        }
      };
      
      // Get status badge color and label
      const getStatusInfo = (status) => {
        const statusMap = {
          'delivered': { label: 'Delivered', color: 'success', icon: 'check-circle' },
          'completed': { label: 'Completed', color: 'success', icon: 'check-circle' },
          'cancelled': { label: 'Cancelled', color: 'danger', icon: 'x-circle' },
          'returned': { label: 'Returned', color: 'warning', icon: 'refresh-cw' },
          'refunded': { label: 'Refunded', color: 'info', icon: 'credit-card' }
        };
        return statusMap[status] || { label: status, color: 'secondary', icon: 'help-circle' };
      };
      
      return {
        /**
         * ORDER SUMMARY
         */
        orderSummary: {
          id: order.id,
          orderNumber: order.orderNumber,
          storeId: order.storeId,
          storeName: order.store?.name,
          storeLocation: order.store ? {
            latitude: order.store.latitude,
            longitude: order.store.longitude
          } : null,
          status: order.status,
          statusInfo: getStatusInfo(order.status),
          deliveryType: order.deliveryType,
          completionDate: getCompletionDate(order),
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
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
          
          // OTP fields
          otp: order.otp,
          pickupOtp: order.pickupOtp,
          deliveryPickupOtp: order.deliveryPickupOtp,
          otpVerified: order.otpVerified,
          pickupOtpVerified: order.pickupOtpVerified,
          deliveryPickupOtpVerified: order.deliveryPickupOtpVerified,
          
          // Delivery info
          deliveryBoyId: order.deliveryBoyId,
          deliverySlotId: order.deliverySlotId,
          deliveryDate: order.deliveryDate,
          distanceKm: order.distanceKm,
          deliveryType: order.deliveryType,
          
          // Invoice
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
          cancelledAt: order.cancelledAt,
          refundedAt: order.refundedAt,
          
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
         * SHIPPING ADDRESS
         */
        address: order.address ? {
          id: order.address.id,
          fullName: order.address.fullName,
          email: order.address.email,
          phoneNumber: order.address.phoneNumber,
          addressLine: order.address.addressLine,
          house: order.address.house,
          neighborhood: order.address.neighborhood,
          landmark: order.address.landmark,
          area: order.address.area,
          locality: order.address.locality,
          city: order.address.city,
          state: order.address.state,
          zipCode: order.address.zipCode,
          country: order.address.country,
          latitude: order.address.latitude,
          longitude: order.address.longitude,
          formattedAddress: order.address.formattedAddress,
          googleMapsLink: order.address.googleMapsLink,
          directionsLink: order.address.directionsLink,
          shippingType: order.address.shippingType,
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
          transactionId: order.transactionId,
        },
        
        /**
         * COMPLETION TIMELINE
         */
        completionTimeline: {
          orderPlaced: order.createdAt,
          confirmed: order.confirmedAt,
          processing: order.pickingAt || order.packedAt,
          shipped: order.shippedAt || order.dispatchedAt,
          outForDelivery: order.outForDeliveryAt,
          delivered: order.deliveredAt,
          completed: order.completedAt,
          cancelled: order.cancelledAt,
          refunded: order.refundedAt
        },
        
        /**
         * REFUND INFORMATION (if applicable)
         */
        refundInfo: order.status === 'refunded' || order.status === 'returned' ? {
          refundedAt: order.refundedAt,
          refundAmount: order.totalAmount,
          refundStatus: order.paymentStatus,
          cancellationReason: order.cancellationReason
        } : null
      };
    });
    
    // Get summary statistics for history orders
    const summary = {
      totalHistoryOrders: orders.count,
      byStatus: {},
      byStore: {},
      byPaymentMethod: {},
      totalRevenue: 0,
      totalRefunded: 0,
      averageOrderValue: 0
    };
    
    // Calculate summaries
    let totalRevenueSum = 0;
    let totalRefundedSum = 0;
    
    formattedOrders.forEach(order => {
      // Count by status
      const status = order.orderSummary.status;
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      
      // Count by store
      const storeName = order.orderSummary.storeName || `Store ${order.orderSummary.storeId}`;
      summary.byStore[storeName] = (summary.byStore[storeName] || 0) + 1;
      
      // Count by payment method
      const paymentMethod = order.orderDetails.paymentMethod || 'Unknown';
      summary.byPaymentMethod[paymentMethod] = (summary.byPaymentMethod[paymentMethod] || 0) + 1;
      
      // Calculate revenue (only for delivered/completed orders)
      if (status === 'delivered' || status === 'completed') {
        totalRevenueSum += parseFloat(order.orderDetails.totalAmount || 0);
      }
      
      // Calculate refunded amount
      if (status === 'refunded' || status === 'cancelled') {
        totalRefundedSum += parseFloat(order.orderDetails.totalAmount || 0);
      }
    });
    
    summary.totalRevenue = totalRevenueSum;
    summary.totalRefunded = totalRefundedSum;
    summary.averageOrderValue = orders.count > 0 ? totalRevenueSum / orders.count : 0;
    
    // Format final response with pagination metadata
    const response = formatPagination(
      { count: orders.count, rows: formattedOrders },
      paginationOptions.currentPage,
      paginationOptions.limit,
    );
    
    res.json({
      success: true,
      filters: {
        role: admin.role,
        storeId: storeCondition.storeId || (admin.role === "storeAdmin" ? admin.storeId : null),
        statuses: historyStatuses
      },
      summary,
      ...response,
    });
    
  } catch (err) {
    console.error("Get admin order history error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * ADMIN: Get orders summary (both active and history combined)
 */
exports.getOrdersSummary = async (req, res) => {
  try {
    const admin = req.admin;
    
    // Build store filter condition
    let storeCondition = {};
    
    if (admin.role === "superAdmin") {
      const { storeId } = req.query;
      if (storeId) {
        storeCondition.storeId = parseInt(storeId);
      }
    } else if (admin.role === "storeAdmin") {
      storeCondition.storeId = admin.storeId;
    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid role"
      });
    }
    
    // Get counts for active orders
    const activeStatuses = ["pending", "confirmed", "picking", "packed", "processing", "shipped", "dispatched", "out_for_delivery"];
    const activeOrdersCount = await Order.count({
      where: {
        ...storeCondition,
        status: {
          [Op.in]: activeStatuses
        }
      }
    });
    
    // Get counts for history orders
    const historyStatuses = ["delivered", "completed", "cancelled", "returned", "refunded"];
    const historyOrdersCount = await Order.count({
      where: {
        ...storeCondition,
        status: {
          [Op.in]: historyStatuses
        }
      }
    });
    
    // Get detailed breakdown by status
    const statusBreakdown = await Order.findAll({
      where: storeCondition,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('status')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']
      ],
      group: ['status']
    });
    
    // Calculate total revenue
    const revenueResult = await Order.findOne({
      where: {
        ...storeCondition,
        status: {
          [Op.in]: ['delivered', 'completed']
        }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue']
      ]
    });
    
    res.json({
      success: true,
      data: {
        summary: {
          activeOrders: activeOrdersCount,
          historyOrders: historyOrdersCount,
          totalOrders: activeOrdersCount + historyOrdersCount,
          totalRevenue: revenueResult?.dataValues?.totalRevenue || 0
        },
        statusBreakdown: statusBreakdown.map(item => ({
          status: item.status,
          count: parseInt(item.dataValues.count),
          total: parseFloat(item.dataValues.total || 0)
        }))
      }
    });
    
  } catch (err) {
    console.error("Get orders summary error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};