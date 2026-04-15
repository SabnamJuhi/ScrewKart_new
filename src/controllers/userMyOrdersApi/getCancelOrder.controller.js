

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
 * USER: Get cancelled orders specifically
 */
exports.getCancelledOrders = async (req, res) => {
  try {
    const paginationOptions = getPaginationOptions(req.query);
    const userId = req.user.id;
    
    const orders = await Order.findAndCountAll({
      where: {
        userId: userId,
        status: "cancelled",
      },
      include: [
        {
          model: Store,
          as: "store",
          required: false,
          attributes: ["id", "name"]
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
              attributes: ["id", "title", "sku"],
            },
            {
              model: ProductVariant,
            //   attributes: ["id", "colorName"],
              include: [{ model: VariantImage, as: "images", limit: 1 }, { model: ProductPrice, as: "price" }],
            },
          ],
        },
      ],
      order: [["cancelledAt", "DESC"]],
      distinct: true,
      ...paginationOptions,
    });
    
    const formattedOrders = orders.rows.map((order) => ({
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      storeName: order.store?.name,
      itemsCount: order.OrderItems?.length || 0,
      canReorder: true
    }));
    
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
      summary: {
        totalCancelled: orders.count,
        totalRefundAmount: orders.rows.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0)
      },
      ...response,
    });
    
  } catch (err) {
    console.error("Get cancelled orders error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};