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
 * ADMIN: Get active orders (with store filtering based on admin role)
 * Supports both superAdmin and storeAdmin
 */
exports.getAdminActiveOrders = async (req, res) => {
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
    
    // Fetch orders with filters
    const orders = await Order.findAndCountAll({
      where: {
        ...storeCondition,
        status: {
          [Op.in]: activeStatuses
        }
      },
      include: [
        {
          model: Store,
          as: "store",
          attributes: ["id", "name", "latitude", "longitude", "deliveryRadius", "isActive", "openTime", "closeTime", "avgDeliveryTime"] // ✅ Only fields that exist
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
      order: [["createdAt", "DESC"]],
      distinct: true, // 🔥 IMPORTANT: Prevents wrong count with includes
      ...paginationOptions,
    });
    
    /**
     * Transform response with enhanced order details
     */
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
          deliveryType: order.deliveryType,
          progress: getDeliveryProgress(order.status),
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
          phone: order.User?.phoneNumber,
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
         * TIMELINE (for UI display)
         */
        timeline: {
          orderPlaced: order.createdAt,
          confirmed: order.confirmedAt,
          processing: order.pickingAt || order.packedAt,
          shipped: order.shippedAt || order.dispatchedAt,
          outForDelivery: order.outForDeliveryAt,
          delivered: order.deliveredAt,
          completed: order.completedAt
        }
      };
    });
    
    // Get summary statistics for the filtered orders
    const summary = {
      totalActiveOrders: orders.count,
      byStatus: {},
      byStore: {},
      totalRevenue: 0
    };
    
    // Calculate summaries
    formattedOrders.forEach(order => {
      // Count by status
      const status = order.orderSummary.status;
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      
      // Count by store
      const storeName = order.orderSummary.storeName || `Store ${order.orderSummary.storeId}`;
      summary.byStore[storeName] = (summary.byStore[storeName] || 0) + 1;
      
      // Calculate total revenue (only for non-cancelled orders)
      if (!['cancelled', 'returned'].includes(status)) {
        summary.totalRevenue += parseFloat(order.orderDetails.totalAmount || 0);
      }
    });
    
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
        statuses: activeStatuses
      },
      summary,
      ...response,
    });
    
  } catch (err) {
    console.error("Get admin active orders error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * ADMIN: Get orders by specific store (with advanced filtering)
 */
exports.getStoreOrders = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status, paymentStatus, deliveryType, startDate, endDate } = req.query;
    const admin = req.admin;
    const paginationOptions = getPaginationOptions(req.query);
    
    // Verify store access
    if (admin.role === "storeAdmin" && parseInt(storeId) !== admin.storeId) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own store orders"
      });
    }
    
    // Build where conditions
    const whereConditions = { storeId: parseInt(storeId) };
    
    if (status) {
      whereConditions.status = {
        [Op.in]: status.split(',')
      };
    }
    
    if (paymentStatus) {
      whereConditions.paymentStatus = paymentStatus;
    }
    
    if (deliveryType) {
      whereConditions.deliveryType = deliveryType;
    }
    
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) whereConditions.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereConditions.createdAt[Op.lte] = new Date(endDate);
    }
    
    const orders = await Order.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Store,
          as: "store",
          attributes: ["id", "name", "latitude", "longitude"]
        },
        {
          model: OrderAddress,
          as: "address",
        },
        {
          model: User,
          attributes: ["id", "userName", "email", "phoneNumber"],
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
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      distinct: true,
      ...paginationOptions,
    });
    
    const formattedOrders = orders.rows.map(order => ({
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: order.User?.userName || order.address?.fullName,
      createdAt: order.createdAt,
      itemsCount: order.OrderItems?.length || 0
    }));
    
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
    console.error("Get store orders error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * ADMIN: Get single order with full details
 */
exports.getAdminOrderDetails = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const admin = req.admin;
    
    const order = await Order.findOne({
      where: { orderNumber },
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
          attributes: ["id", "userName", "email", "phoneNumber"],
        },
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ["id", "title", "sku", "description"],
              include: [{ model: ProductPrice, as: "price" }],
            },
            {
              model: ProductVariant,
              include: [
                { model: VariantImage, as: "images" },
                { model: VariantSize }
              ],
            },
          ],
        },
      ],
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Verify store access
    if (admin.role === "storeAdmin" && order.storeId !== admin.storeId) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this order"
      });
    }
    
    // Format order items
    const items = order.OrderItems.map(item => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      basePrice: item.basePrice,
      gstRate: item.gstRate,
      finalPerUnit: item.finalPerUnit,
      subTotal: item.subTotal,
      taxTotal: item.taxTotal,
      totalPrice: item.totalPrice,
      product: item.Product,
      variant: item.ProductVariant,
      variantSnapshot: item.variantSnapshot
    }));
    
    res.json({
      success: true,
      data: {
        order: {
          ...order.toJSON(),
          OrderItems: items
        }
      }
    });
    
  } catch (err) {
    console.error("Get admin order details error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};