const { Op, fn, col, literal } = require("sequelize");
const { Order, User, Product, OrderItem } = require("../../models");
const moment = require("moment");
const { VariantSize, ProductVariant } = require("../../models");

exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    /* =========================================================
       OVERVIEW
    ========================================================== */

    const totalOrders = await Order.count({ where: dateFilter });

    const totalRevenue = await Order.sum("totalAmount", {
      where: {
        paymentStatus: "paid",
        ...dateFilter,
      },
    });

    const totalCustomers = await User.count();
    const totalProducts = await Product.count();

    /* =========================================================
       ORDER STATUS BREAKDOWN
    ========================================================== */

    const orderStatusStatsRaw = await Order.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
    });

    const orderStatusStats = orderStatusStatsRaw.map((item) => ({
      status: item.status,
      count: Number(item.get("count")),
    }));

    /* =========================================================
       MONTHLY REVENUE (DYNAMIC)
    ========================================================== */

    const monthlyRevenueRaw = await Order.findAll({
      attributes: [
        [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
        [fn("SUM", col("totalAmount")), "revenue"],
      ],
      where: {
        paymentStatus: "paid",
      },
      group: [literal("month")],
      order: [[literal("month"), "ASC"]],
    });

    const monthlyRevenue = monthlyRevenueRaw.map((item) => ({
      month: item.get("month"),
      revenue: Number(item.get("revenue")),
    }));

    /* =========================================================
       AVERAGE ORDER VALUE (AOV)
    ========================================================== */

    const paidOrdersCount = await Order.count({
      where: { paymentStatus: "paid" },
    });

    const paidRevenue = await Order.sum("totalAmount", {
      where: { paymentStatus: "paid" },
    });

    const averageOrderValue = paidOrdersCount
      ? Number(paidRevenue) / paidOrdersCount
      : 0;

    /* =========================================================
       TOP SELLING PRODUCTS
    ========================================================== */

    const topSellingProductsRaw = await OrderItem.findAll({
      attributes: ["productId", [fn("SUM", col("quantity")), "totalSold"]],
      include: [
        {
          model: Product,
          attributes: ["id", "title"],
        },
      ],
      group: ["productId", "Product.id"],
      order: [[literal("totalSold"), "DESC"]],
      limit: 5,
    });

    const topSellingProducts = topSellingProductsRaw.map((item) => ({
      productId: item.productId,
      title: item.Product?.title,
      totalSold: Number(item.get("totalSold")),
    }));

    /* =========================================================
       LOW STOCK ALERTS
    ========================================================== */

    const lowStockProductsRaw = await VariantSize.findAll({
      attributes: [
        [fn("SUM", col("VariantSize.stock")), "totalStock"],
        [col("ProductVariant.product.id"), "productId"],
        [col("ProductVariant.product.title"), "title"],
      ],
      include: [
        {
          model: ProductVariant,
          attributes: [],
          include: [
            {
              model: Product,
              as: "product", // must match your alias exactly
              attributes: [],
            },
          ],
        },
      ],
      group: ["ProductVariant.product.id"],
      having: literal("SUM(VariantSize.stock) <= 10"),
      order: [[literal("totalStock"), "ASC"]],
      raw: true,
      subQuery: false,
    });

    const lowStockProducts = lowStockProductsRaw.map((item) => ({
      productId: item.productId,
      title: item.title,
      totalStock: Number(item.totalStock),
    }));

    /* =========================================================
       DAILY ACTIVE USERS
    ========================================================== */

    const todayStart = moment().startOf("day").toDate();

    const dailyActiveUsers = await Order.count({
      distinct: true,
      col: "userId",
      where: {
        createdAt: {
          [Op.gte]: todayStart,
        },
      },
    });

    /* =========================================================
       PAYMENT METHOD DISTRIBUTION
    ========================================================== */

    const paymentDistributionRaw = await Order.findAll({
      attributes: ["paymentMethod", [fn("COUNT", col("id")), "count"]],
      group: ["paymentMethod"],
    });

    const paymentDistribution = paymentDistributionRaw.map((item) => ({
      paymentMethod: item.paymentMethod,
      count: Number(item.get("count")),
    }));

    /* =========================================================
       REVENUE GROWTH % (VS PREVIOUS MONTH)
    ========================================================== */

    const startOfCurrentMonth = moment().startOf("month").toDate();
    const startOfPreviousMonth = moment()
      .subtract(1, "month")
      .startOf("month")
      .toDate();
    const endOfPreviousMonth = moment()
      .subtract(1, "month")
      .endOf("month")
      .toDate();

    const currentMonthRevenue = await Order.sum("totalAmount", {
      where: {
        paymentStatus: "paid",
        createdAt: {
          [Op.gte]: startOfCurrentMonth,
        },
      },
    });

    const previousMonthRevenue = await Order.sum("totalAmount", {
      where: {
        paymentStatus: "paid",
        createdAt: {
          [Op.between]: [startOfPreviousMonth, endOfPreviousMonth],
        },
      },
    });

    const revenueGrowth =
      previousMonthRevenue > 0
        ? (
            ((Number(currentMonthRevenue || 0) -
              Number(previousMonthRevenue || 0)) /
              Number(previousMonthRevenue)) *
            100
          ).toFixed(2)
        : 0;

    /* =========================================================
       FINAL RESPONSE
    ========================================================== */

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalOrders,
          totalRevenue: Number(totalRevenue || 0),
          totalCustomers,
          totalProducts,
        },
        orderStatusStats,
        monthlyRevenue,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        topSellingProducts,
        lowStockProducts,
        dailyActiveUsers,
        paymentDistribution,
        revenueGrowthPercentage: Number(revenueGrowth),
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};
