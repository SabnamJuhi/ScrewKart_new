


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
 * USER: Get order history (delivered, completed, cancelled, refunded orders)
 */
exports.getOrderHistory = async (req, res) => {
  try {
    const paginationOptions = getPaginationOptions(req.query);
    const userId = req.user.id;
    
    // Define history statuses
    const historyStatuses = [
      "delivered",
      "completed", 
      "cancelled",
      "returned",
      "refunded"
    ];
    
    const orders = await Order.findAndCountAll({
      where: {
        userId: userId,
        status: {
          [Op.in]: historyStatuses
        }
      },
      include: [
        {
          model: Store,
          as: "store",
          required: false,
          attributes: ["id", "name", "latitude", "longitude", "deliveryRadius", "avgDeliveryTime"]
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
              // include: [{ model: ProductPrice, as: "price" }],
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
      order: [["completedAt", "DESC"], ["deliveredAt", "DESC"], ["createdAt", "DESC"]],
      distinct: true,
      ...paginationOptions,
    });

    const formattedOrders = orders.rows.map((order) => {
      // Transform order items
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
      
      // Get status badge info for UI
      const getStatusInfo = (status) => {
        const statusMap = {
          'delivered': { label: 'Delivered', color: 'success', icon: 'check-circle', type: 'positive' },
          'completed': { label: 'Completed', color: 'success', icon: 'check-circle', type: 'positive' },
          'cancelled': { label: 'Cancelled', color: 'danger', icon: 'x-circle', type: 'negative' },
          'returned': { label: 'Returned', color: 'warning', icon: 'refresh-cw', type: 'warning' },
          'refunded': { label: 'Refunded', color: 'info', icon: 'credit-card', type: 'info' }
        };
        return statusMap[status] || { label: status, color: 'secondary', icon: 'help-circle', type: 'neutral' };
      };
      
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
          statusInfo: getStatusInfo(order.status),
          deliveryType: order.deliveryType,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
          completedAt: getCompletionDate(order),
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
         * STORE INFORMATION
         */
        store: order.store ? {
          id: order.store.id,
          name: order.store.name,
          location: {
            latitude: order.store.latitude,
            longitude: order.store.longitude
          },
          deliveryRadius: order.store.deliveryRadius,
          avgDeliveryTime: order.store.avgDeliveryTime
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
        refundInfo: (order.status === 'refunded' || order.status === 'returned' || order.status === 'cancelled') ? {
          refundedAt: order.refundedAt,
          refundAmount: order.totalAmount,
          refundStatus: order.paymentStatus,
          cancellationReason: order.cancellationReason,
          refundMethod: order.paymentMethod === 'COD' ? 'Store Credit / Bank Transfer' : 'Original Payment Method'
        } : null,
        
        /**
         * USER ACTIONS
         */
        actions: {
          canReorder: order.status === 'delivered' || order.status === 'completed',
          canViewInvoice: !!order.invoiceUrl,
          canWriteReview: order.status === 'completed' || order.status === 'delivered',
          canTrack: false // History orders are complete, no tracking needed
        }
      };
    });
    
    // Get summary statistics for history orders
    const summary = {
      totalOrders: orders.count,
      byStatus: {},
      totalSpent: 0,
      totalRefunded: 0,
      averageOrderValue: 0
    };
    
    // Calculate summaries
    let totalSpentSum = 0;
    let totalRefundedSum = 0;
    
    formattedOrders.forEach(order => {
      const status = order.orderSummary.status;
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      
      // Calculate total spent (only for delivered/completed)
      if (status === 'delivered' || status === 'completed') {
        totalSpentSum += parseFloat(order.orderDetails.totalAmount || 0);
      }
      
      // Calculate total refunded
      if (status === 'refunded' || status === 'cancelled' || status === 'returned') {
        totalRefundedSum += parseFloat(order.orderDetails.totalAmount || 0);
      }
    });
    
    summary.totalSpent = totalSpentSum;
    summary.totalRefunded = totalRefundedSum;
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
    console.error("Get order history error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};