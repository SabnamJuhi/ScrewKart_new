// const { Op, fn, col, literal } = require("sequelize");
// const { Order, User, Product, OrderItem } = require("../../models");
// const moment = require("moment");
// const { VariantSize, ProductVariant } = require("../../models");

// exports.getDashboardStats = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     const dateFilter = {};
//     if (startDate && endDate) {
//       dateFilter.createdAt = {
//         [Op.between]: [new Date(startDate), new Date(endDate)],
//       };
//     }

//     /* =========================================================
//        OVERVIEW
//     ========================================================== */

//     const totalOrders = await Order.count({ where: dateFilter });

//     const totalRevenue = await Order.sum("totalAmount", {
//       where: {
//         paymentStatus: "paid",
//         ...dateFilter,
//       },
//     });

//     const totalCustomers = await User.count();
//     const totalProducts = await Product.count();

//     /* =========================================================
//        ORDER STATUS BREAKDOWN
//     ========================================================== */

//     const orderStatusStatsRaw = await Order.findAll({
//       attributes: ["status", [fn("COUNT", col("id")), "count"]],
//       group: ["status"],
//     });

//     const orderStatusStats = orderStatusStatsRaw.map((item) => ({
//       status: item.status,
//       count: Number(item.get("count")),
//     }));

//     /* =========================================================
//        MONTHLY REVENUE (DYNAMIC)
//     ========================================================== */

//     const monthlyRevenueRaw = await Order.findAll({
//       attributes: [
//         [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
//         [fn("SUM", col("totalAmount")), "revenue"],
//       ],
//       where: {
//         paymentStatus: "paid",
//       },
//       group: [literal("month")],
//       order: [[literal("month"), "ASC"]],
//     });

//     const monthlyRevenue = monthlyRevenueRaw.map((item) => ({
//       month: item.get("month"),
//       revenue: Number(item.get("revenue")),
//     }));

//     /* =========================================================
//        AVERAGE ORDER VALUE (AOV)
//     ========================================================== */

//     const paidOrdersCount = await Order.count({
//       where: { paymentStatus: "paid" },
//     });

//     const paidRevenue = await Order.sum("totalAmount", {
//       where: { paymentStatus: "paid" },
//     });

//     const averageOrderValue = paidOrdersCount
//       ? Number(paidRevenue) / paidOrdersCount
//       : 0;

//     /* =========================================================
//        TOP SELLING PRODUCTS
//     ========================================================== */

//     const topSellingProductsRaw = await OrderItem.findAll({
//       attributes: ["productId", [fn("SUM", col("quantity")), "totalSold"]],
//       include: [
//         {
//           model: Product,
//           attributes: ["id", "title"],
//         },
//       ],
//       group: ["productId", "Product.id"],
//       order: [[literal("totalSold"), "DESC"]],
//       limit: 5,
//     });

//     const topSellingProducts = topSellingProductsRaw.map((item) => ({
//       productId: item.productId,
//       title: item.Product?.title,
//       totalSold: Number(item.get("totalSold")),
//     }));

//     /* =========================================================
//        LOW STOCK ALERTS
//     ========================================================== */

//     const lowStockProductsRaw = await VariantSize.findAll({
//       attributes: [
//         [fn("SUM", col("VariantSize.stock")), "totalStock"],
//         [col("ProductVariant.product.id"), "productId"],
//         [col("ProductVariant.product.title"), "title"],
//       ],
//       include: [
//         {
//           model: ProductVariant,
//           attributes: [],
//           include: [
//             {
//               model: Product,
//               as: "product", // must match your alias exactly
//               attributes: [],
//             },
//           ],
//         },
//       ],
//       group: ["ProductVariant.product.id"],
//       having: literal("SUM(VariantSize.stock) <= 10"),
//       order: [[literal("totalStock"), "ASC"]],
//       raw: true,
//       subQuery: false,
//     });

//     const lowStockProducts = lowStockProductsRaw.map((item) => ({
//       productId: item.productId,
//       title: item.title,
//       totalStock: Number(item.totalStock),
//     }));

//     /* =========================================================
//        DAILY ACTIVE USERS
//     ========================================================== */

//     const todayStart = moment().startOf("day").toDate();

//     const dailyActiveUsers = await Order.count({
//       distinct: true,
//       col: "userId",
//       where: {
//         createdAt: {
//           [Op.gte]: todayStart,
//         },
//       },
//     });

//     /* =========================================================
//        PAYMENT METHOD DISTRIBUTION
//     ========================================================== */

//     const paymentDistributionRaw = await Order.findAll({
//       attributes: ["paymentMethod", [fn("COUNT", col("id")), "count"]],
//       group: ["paymentMethod"],
//     });

//     const paymentDistribution = paymentDistributionRaw.map((item) => ({
//       paymentMethod: item.paymentMethod,
//       count: Number(item.get("count")),
//     }));

//     /* =========================================================
//        REVENUE GROWTH % (VS PREVIOUS MONTH)
//     ========================================================== */

//     const startOfCurrentMonth = moment().startOf("month").toDate();
//     const startOfPreviousMonth = moment()
//       .subtract(1, "month")
//       .startOf("month")
//       .toDate();
//     const endOfPreviousMonth = moment()
//       .subtract(1, "month")
//       .endOf("month")
//       .toDate();

//     const currentMonthRevenue = await Order.sum("totalAmount", {
//       where: {
//         paymentStatus: "paid",
//         createdAt: {
//           [Op.gte]: startOfCurrentMonth,
//         },
//       },
//     });

//     const previousMonthRevenue = await Order.sum("totalAmount", {
//       where: {
//         paymentStatus: "paid",
//         createdAt: {
//           [Op.between]: [startOfPreviousMonth, endOfPreviousMonth],
//         },
//       },
//     });

//     const revenueGrowth =
//       previousMonthRevenue > 0
//         ? (
//             ((Number(currentMonthRevenue || 0) -
//               Number(previousMonthRevenue || 0)) /
//               Number(previousMonthRevenue)) *
//             100
//           ).toFixed(2)
//         : 0;

//     /* =========================================================
//        FINAL RESPONSE
//     ========================================================== */

//     return res.status(200).json({
//       success: true,
//       data: {
//         overview: {
//           totalOrders,
//           totalRevenue: Number(totalRevenue || 0),
//           totalCustomers,
//           totalProducts,
//         },
//         orderStatusStats,
//         monthlyRevenue,
//         averageOrderValue: Number(averageOrderValue.toFixed(2)),
//         topSellingProducts,
//         lowStockProducts,
//         dailyActiveUsers,
//         paymentDistribution,
//         revenueGrowthPercentage: Number(revenueGrowth),
//       },
//     });
//   } catch (error) {
//     console.error("Dashboard Stats Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch dashboard statistics",
//     });
//   }
// };


const { Op, fn, col, literal, Sequelize } = require("sequelize");
const { Order, User, Product, OrderItem, ProductVariant, VariantSize, ProductReview, ProductRating } = require("../../models");
const moment = require("moment");

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
       SECTION 1: OVERVIEW STATISTICS (4 points)
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
       SECTION 2: ORDER STATUS BREAKDOWN (1 point)
    ========================================================== */

    const orderStatusStatsRaw = await Order.findAll({
      attributes: [
        "status",
        [fn("COUNT", col("id")), "count"]
      ],
      where: dateFilter,
      group: ["status"],
    });

    const orderStatusStats = orderStatusStatsRaw.map((item) => ({
      status: item.status,
      count: Number(item.get("count")),
    }));

    /* =========================================================
       SECTION 3: REVENUE TRENDS (3 points)
    ========================================================== */

    const monthlyRevenueRaw = await Order.findAll({
      attributes: [
        [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
        [fn("SUM", col("totalAmount")), "revenue"],
      ],
      where: {
        paymentStatus: "paid",
      },
      group: [fn("DATE_FORMAT", col("createdAt"), "%Y-%m")],
      order: [[literal("month"), "ASC"]],
      limit: 12,
    });

    const monthlyRevenue = monthlyRevenueRaw.map((item) => ({
      month: item.get("month"),
      revenue: Number(item.get("revenue")),
    }));

    const paidOrdersCount = await Order.count({
      where: { paymentStatus: "paid", ...dateFilter },
    });

    const paidRevenue = await Order.sum("totalAmount", {
      where: { paymentStatus: "paid", ...dateFilter },
    });

    const averageOrderValue = paidOrdersCount
      ? Number(paidRevenue) / paidOrdersCount
      : 0;

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
        createdAt: { [Op.gte]: startOfCurrentMonth },
      },
    });

    const previousMonthRevenue = await Order.sum("totalAmount", {
      where: {
        paymentStatus: "paid",
        createdAt: { [Op.between]: [startOfPreviousMonth, endOfPreviousMonth] },
      },
    });

    const revenueGrowth = previousMonthRevenue > 0
      ? (((Number(currentMonthRevenue || 0) - Number(previousMonthRevenue || 0)) / Number(previousMonthRevenue)) * 100).toFixed(2)
      : 0;

    /* =========================================================
       SECTION 4: PRODUCT PERFORMANCE (3 points)
    ========================================================== */

    // 8. Top Selling Products
    const topSellingProductsRaw = await OrderItem.findAll({
  attributes: [
    "productId",
    [fn("SUM", col("quantity")), "totalSold"],
    [fn("SUM", col("totalPrice")), "totalRevenue"],
    [fn("AVG", col("finalPerUnit")), "avgPrice"],
  ],
  include: [
    {
      model: Product,
      attributes: ["id", "title"], // ✅ removed soldCount
    },
    {
      model: Order,
      attributes: [],
      where: { paymentStatus: "paid" },
      required: true,
    },
  ],
  group: ["productId", "Product.id", "Product.title"], // ✅ include grouped cols
  order: [[literal("totalSold"), "DESC"]],
  limit: 10,
});

   const topSellingProducts = topSellingProductsRaw.map((item) => ({
  productId: item.productId,
  title: item.Product?.title,
  totalSold: Number(item.get("totalSold")),
  totalRevenue: Number(item.get("totalRevenue") || 0),
  averagePrice: Number(item.get("avgPrice") || 0),
}));

    // 9. Top Selling Variants - Using raw query to avoid GROUP BY issues
    let topSellingVariants = [];
    try {
      const [variantResults] = await sequelize.query(`
        SELECT 
          oi.variantId,
          pv.variantCode,
          pv.unit,
          pv.packQuantity,
          p.title as productTitle,
          SUM(oi.quantity) as totalSold,
          SUM(oi.totalPrice) as totalRevenue,
          AVG(oi.finalPerUnit) as avgPrice
        FROM order_items oi
        INNER JOIN orders o ON oi.orderId = o.id
        LEFT JOIN product_variants pv ON oi.variantId = pv.id
        LEFT JOIN products p ON pv.productId = p.id
        WHERE o.paymentStatus = 'paid'
        GROUP BY oi.variantId
        ORDER BY totalSold DESC
        LIMIT 10
      `);
      
      topSellingVariants = variantResults.map(item => ({
        variantId: item.variantId,
        variantCode: item.variantCode,
        productTitle: item.productTitle,
        unit: item.unit,
        packQuantity: item.packQuantity,
        totalSold: Number(item.totalSold),
        totalRevenue: Number(item.totalRevenue || 0),
        averagePrice: Number(item.avgPrice || 0),
      }));
    } catch (err) {
      console.log("Top selling variants query failed:", err.message);
    }

    // 10. Product Performance - Using raw queries to avoid GROUP BY issues
    let productPerformance = [];
    try {
      const [lifetimeResults] = await sequelize.query(`
        SELECT 
          oi.productId,
          p.title,
          p.soldCount as lifetimeSold,
          SUM(oi.quantity) as totalQuantity,
          SUM(oi.totalPrice) as totalRevenue
        FROM order_items oi
        INNER JOIN orders o ON oi.orderId = o.id
        LEFT JOIN products p ON oi.productId = p.id
        WHERE o.paymentStatus = 'paid'
        GROUP BY oi.productId
        ORDER BY totalQuantity DESC
        LIMIT 20
      `);

      const [monthlyResults] = await sequelize.query(`
        SELECT 
          oi.productId,
          SUM(oi.quantity) as monthlyQuantity,
          SUM(oi.totalPrice) as monthlyRevenue
        FROM order_items oi
        INNER JOIN orders o ON oi.orderId = o.id
        WHERE o.paymentStatus = 'paid'
          AND o.createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')
        GROUP BY oi.productId
      `);

      const monthlyMap = new Map();
      monthlyResults.forEach(item => {
        monthlyMap.set(item.productId, {
          monthlySales: Number(item.monthlyQuantity),
          monthlyRevenue: Number(item.monthlyRevenue),
        });
      });

      productPerformance = lifetimeResults.map(item => ({
        productId: item.productId,
        title: item.title,
        lifetimeSold: item.lifetimeSold || 0,
        lifetimeSales: Number(item.totalQuantity || 0),
        lifetimeRevenue: Number(item.totalRevenue || 0),
        monthlySales: monthlyMap.get(item.productId)?.monthlySales || 0,
        monthlyRevenue: monthlyMap.get(item.productId)?.monthlyRevenue || 0,
      }));
    } catch (err) {
      console.log("Product performance query failed:", err.message);
    }

    /* =========================================================
       SECTION 5: LOW STOCK ALERTS (1 point)
    ========================================================== */

    let lowStockVariants = [];
    let lowStockProducts = [];

    try {
      lowStockVariants = await ProductVariant.findAll({
        attributes: [
          "id",
          "variantCode",
          "totalStock",
          "stockStatus",
          "productId",
        ],
        where: {
          totalStock: { [Op.lte]: 10 },
          isActive: true,
        },
        order: [["totalStock", "ASC"]],
      });

      // Get product titles separately
      for (const variant of lowStockVariants) {
        const product = await Product.findByPk(variant.productId, {
          attributes: ["title"]
        });
        variant.dataValues.productTitle = product?.title;
      }

      const productStockMap = new Map();
      lowStockVariants.forEach(variant => {
        if (!productStockMap.has(variant.productId)) {
          productStockMap.set(variant.productId, {
            productId: variant.productId,
            productTitle: variant.dataValues.productTitle,
            totalStock: 0,
            variants: [],
          });
        }
        const product = productStockMap.get(variant.productId);
        product.totalStock += variant.totalStock;
        product.variants.push({
          variantId: variant.id,
          variantCode: variant.variantCode,
          stock: variant.totalStock,
          status: variant.stockStatus,
        });
      });

      lowStockProducts = Array.from(productStockMap.values()).map(product => ({
        productId: product.productId,
        title: product.productTitle,
        totalStock: product.totalStock,
        alertLevel: product.totalStock <= 5 ? "CRITICAL" : "LOW",
        variants: product.variants,
      }));
    } catch (err) {
      console.log("Low stock query failed:", err.message);
    }

    /* =========================================================
       SECTION 6: CUSTOMER ANALYTICS (2 points)
    ========================================================== */

    const todayStart = moment().startOf("day").toDate();
    const dailyActiveUsers = await Order.count({
      distinct: true,
      col: "userId",
      where: { createdAt: { [Op.gte]: todayStart } },
    });

    // Get repeat customers using raw query to avoid issues
    let repeatCustomers = 0;
    let repeatCustomerRate = 0;
    let oneTimeCustomers = 0;
    let averageOrdersPerCustomer = 0;
    let clv = 0;

    try {
      const [customerStats] = await sequelize.query(`
        SELECT 
          COUNT(DISTINCT userId) as totalCustomers,
          COUNT(CASE WHEN orderCount > 1 THEN 1 END) as repeatCustomers,
          AVG(orderCount) as avgOrdersPerCustomer
        FROM (
          SELECT userId, COUNT(*) as orderCount
          FROM orders
          WHERE paymentStatus = 'paid'
          GROUP BY userId
        ) as customerOrders
      `);

      repeatCustomers = Number(customerStats[0]?.repeatCustomers || 0);
      repeatCustomerRate = totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(2) : 0;
      oneTimeCustomers = totalCustomers - repeatCustomers;
      averageOrdersPerCustomer = Number(customerStats[0]?.avgOrdersPerCustomer || 0).toFixed(2);
      clv = paidOrdersCount > 0 && repeatCustomers > 0
        ? (Number(paidRevenue) / repeatCustomers).toFixed(2)
        : (Number(paidRevenue) / Math.max(totalCustomers, 1)).toFixed(2);
    } catch (err) {
      console.log("Customer stats query failed:", err.message);
    }

    /* =========================================================
       SECTION 7: PAYMENT & ORDER INSIGHTS (2 points)
    ========================================================== */

    const paymentDistributionRaw = await Order.findAll({
      attributes: [
        "paymentMethod",
        [fn("COUNT", col("id")), "count"]
      ],
      where: { ...dateFilter, paymentStatus: "paid" },
      group: ["paymentMethod"],
    });

    const paymentDistribution = paymentDistributionRaw.map((item) => ({
      paymentMethod: item.paymentMethod || "unknown",
      count: Number(item.get("count")),
      percentage: totalOrders > 0
        ? ((Number(item.get("count")) / totalOrders) * 100).toFixed(2)
        : 0,
    }));

    // Order value distribution using raw query
    let orderValueBins = [];
    try {
      const [binResults] = await sequelize.query(`
        SELECT 
          CASE 
            WHEN totalAmount < 500 THEN 'Under ₹500'
            WHEN totalAmount >= 500 AND totalAmount < 1000 THEN '₹500 - ₹1000'
            WHEN totalAmount >= 1000 AND totalAmount < 2500 THEN '₹1000 - ₹2500'
            WHEN totalAmount >= 2500 AND totalAmount < 5000 THEN '₹2500 - ₹5000'
            WHEN totalAmount >= 5000 AND totalAmount < 10000 THEN '₹5000 - ₹10000'
            ELSE 'Above ₹10000'
          END as priceRange,
          COUNT(*) as count,
          SUM(totalAmount) as totalValue
        FROM orders
        WHERE paymentStatus = 'paid'
        ${startDate && endDate ? 'AND createdAt BETWEEN :startDate AND :endDate' : ''}
        GROUP BY priceRange
        ORDER BY MIN(totalAmount)
      `, {
        replacements: startDate && endDate ? { 
          startDate: new Date(startDate), 
          endDate: new Date(endDate) 
        } : {}
      });

      orderValueBins = binResults.map(bin => ({
        priceRange: bin.priceRange,
        count: Number(bin.count),
        totalValue: Number(bin.totalValue),
        percentage: totalOrders > 0 ? ((Number(bin.count) / totalOrders) * 100).toFixed(2) : 0,
      }));
    } catch (err) {
      console.log("Order value bins query failed:", err.message);
    }

    /* =========================================================
       SECTION 8: PRODUCT REVIEWS & RATINGS (1 point)
    ========================================================== */

    let productRatings = [];
    let averageProductRating = 0;

    try {
      const ratingsRaw = await ProductRating.findAll({
        attributes: [
          "productId",
          "averageRating",
          "totalRatings",
          "totalReviews",
          "fiveStar",
          "fourStar",
          "threeStar",
          "twoStar",
          "oneStar",
        ],
        order: [["averageRating", "DESC"]],
      });

      // Get product titles separately
      for (const rating of ratingsRaw) {
        const product = await Product.findByPk(rating.productId, {
          attributes: ["title"]
        });
        rating.dataValues.productTitle = product?.title;
      }

      productRatings = ratingsRaw.map(p => ({
        productId: p.productId,
        productTitle: p.dataValues.productTitle,
        averageRating: parseFloat(p.averageRating || 0).toFixed(1),
        totalRatings: p.totalRatings || 0,
        totalReviews: p.totalReviews || 0,
        starBreakdown: {
          5: p.fiveStar || 0,
          4: p.fourStar || 0,
          3: p.threeStar || 0,
          2: p.twoStar || 0,
          1: p.oneStar || 0,
        },
      }));

      const totalAvgRating = productRatings.reduce((sum, p) => sum + parseFloat(p.averageRating), 0);
      averageProductRating = productRatings.length > 0
        ? (totalAvgRating / productRatings.length).toFixed(1)
        : 0;
    } catch (err) {
      console.log("ProductRating query failed:", err.message);
    }

 
    /* =========================================================
       FINAL RESPONSE
    ========================================================== */

    return res.status(200).json({
      success: true,
      totalDataPoints: 16,
      data: {
        overview: {
          totalOrders,
          totalRevenue: Number(totalRevenue || 0),
          totalCustomers,
          totalProducts,
        },
        orderStatusStats,
        revenueTrends: {
          monthlyRevenue,
          averageOrderValue: Number(averageOrderValue.toFixed(2)),
          revenueGrowthPercentage: Number(revenueGrowth),
        },
        productPerformance: {
          topSellingProducts,
          topSellingVariants,
          productSalesStats: productPerformance,
        },
        lowStockAlerts: {
          summary: {
            totalLowStockProducts: lowStockProducts.length,
            totalLowStockVariants: lowStockVariants.length,
            criticalCount: lowStockProducts.filter(p => p.alertLevel === "CRITICAL").length,
          },
          lowStockProducts,
          lowStockVariants: lowStockVariants.map(v => ({
            variantId: v.id,
            variantCode: v.variantCode,
            productTitle: v.dataValues.productTitle,
            stock: v.totalStock,
            status: v.stockStatus,
          })),
        },
        customerAnalytics: {
          dailyActiveUsers,
          repeatCustomers: {
            count: repeatCustomers,
            rate: Number(repeatCustomerRate),
            oneTimeCustomers,
            averageOrdersPerCustomer: Number(averageOrdersPerCustomer),
            customerLifetimeValue: Number(clv),
          },
        },
        paymentDistribution,
        orderValueDistribution: orderValueBins,
        productRatings: {
          averageRating: Number(averageProductRating),
          totalProductsWithRatings: productRatings.length,
          topRatedProducts: productRatings.slice(0, 5),
          allProductRatings: productRatings,
        },
      },
    });

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};