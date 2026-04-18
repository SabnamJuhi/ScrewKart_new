



const {
  Order,
  OrderAddress,
  OrderItem,
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
 * USER: Get active orders for the logged-in user
 * Returns orders that are in progress (not completed/cancelled)
 */
exports.getActiveOrders = async (req, res) => {
  try {
    const paginationOptions = getPaginationOptions(req.query);
    const userId = req.user.id;
    
    // Define active statuses (excluding terminal states)
    const activeStatuses = [
      "pending",
      "confirmed", 
      "picking",
      "packed",
      "processing",
      "shipped",
      "dispatched",
      "out_for_delivery"
    ];
    
    const orders = await Order.findAndCountAll({
      where: {
        userId: userId,
        status: {
          [Op.in]: activeStatuses
        }
      },
      include: [
        {
          model: Store,
          as: "store",
          required: false, // LEFT JOIN in case store is missing
          attributes: ["id", "name", "latitude", "longitude", "deliveryRadius", "isActive", "openTime", "closeTime", "avgDeliveryTime"]
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
      order: [["createdAt", "DESC"]],
      distinct: true,
      ...paginationOptions,
    });

    // Format response matching admin API structure
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
      
      // Calculate delivery progress based on status
      const getDeliveryProgress = (status) => {
        const progressMap = {
          'pending': 0,
          'confirmed': 10,
          'picking': 25,
          'packed': 40,
          'processing': 40,
          'shipped': 60,
          'dispatched': 60,
          'out_for_delivery': 80,
          'delivered': 100,
          'completed': 100
        };
        return progressMap[status] || 0;
      };
      
      // Get next step description for user
      const getNextStep = (status, deliveryType) => {
        const steps = {
          'pending': 'Your order is being confirmed',
          'confirmed': 'Store is preparing your order',
          'picking': 'Items are being picked',
          'packed': 'Order is ready for dispatch',
          'dispatched': 'Order has been dispatched',
          'out_for_delivery': deliveryType === 'pickup' ? 'Ready for pickup at store' : 'Delivery partner is on the way',
          'processing': 'Order is being processed'
        };
        return steps[status] || 'Order is in progress';
      };
      
      // Check if order can be cancelled
      const canCancel = ["pending", "confirmed", "picking", "packed"].includes(order.status);
      
      // Check if order can be tracked
      const canTrack = ["dispatched", "out_for_delivery"].includes(order.status);
      
      return {
        /**
         * ORDER SUMMARY (for quick view)
         */
        orderSummary: {
          id: order.id,
          orderNumber: order.orderNumber,
          storeId: order.storeId,
          storeName: order.store?.name || `Store ${order.storeId}`,
          status: order.status,
          deliveryType: order.deliveryType,
          progress: getDeliveryProgress(order.status),
          nextStep: getNextStep(order.status, order.deliveryType),
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          canCancel: canCancel,
          canTrack: canTrack,
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
          
          // OTP fields (for pickup/delivery verification)
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
          avgDeliveryTime: order.store.avgDeliveryTime,
          isActive: order.store.isActive,
          timing: {
            openTime: order.store.openTime,
            closeTime: order.store.closeTime
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
         * ORDER TIMELINE (for UI display)
         */
        timeline: {
          orderPlaced: order.createdAt,
          confirmed: order.confirmedAt,
          processing: order.pickingAt || order.packedAt,
          shipped: order.shippedAt || order.dispatchedAt,
          outForDelivery: order.outForDeliveryAt,
          delivered: order.deliveredAt,
          completed: order.completedAt,
          cancelled: order.cancelledAt
        },
        
        /**
         * USER ACTIONS (what user can do with this order)
         */
        actions: {
          canCancel: canCancel,
          canTrack: canTrack,
          canReorder: order.status === 'delivered' || order.status === 'completed',
          canViewInvoice: !!order.invoiceUrl,
          needOtpForPickup: order.deliveryType === 'pickup' && !order.pickupOtpVerified && order.status === 'packed',
          needOtpForDelivery: order.deliveryType === 'delivery' && !order.deliveryPickupOtpVerified && order.status === 'dispatched'
        }
      };
    });
    
    // Get summary for user's active orders
    const summary = {
      totalActiveOrders: orders.count,
      byStatus: {},
      totalAmount: 0,
      estimatedDeliveryTime: 0
    };
    
    // Calculate summaries
    formattedOrders.forEach(order => {
      const status = order.orderSummary.status;
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      summary.totalAmount += parseFloat(order.orderDetails.totalAmount || 0);
      
      // Get max estimated delivery time
      if (order.store?.avgDeliveryTime > summary.estimatedDeliveryTime) {
        summary.estimatedDeliveryTime = order.store?.avgDeliveryTime || 0;
      }
    });
    
    // Format pagination response
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
      summary: summary,
      ...response,
    });
    
  } catch (err) {
    console.error("Get user active orders error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};