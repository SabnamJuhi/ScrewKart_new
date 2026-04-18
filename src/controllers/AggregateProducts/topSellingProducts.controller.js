const {
  Product,
  OrderItem,
  Category,
  SubCategory,
  ProductCategory,
  ProductVariant,
  VariantImage,
  ProductPrice,
  ProductAttribute,
  ProductMeasurement,
  MeasurementMaster,
  OfferApplicableProduct,
  Offer,
  OfferSub,
  StoreInventory,
  Order
} = require("../../models");
const { Sequelize } = require("sequelize");
const sequelize = require("../../config/db");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.getTopSellingProducts = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "storeId is required",
      });
    }

    // Get pagination options from request query
    const paginationOptions = getPaginationOptions(req.query);
    const limit = paginationOptions.limit;
    const currentPage = paginationOptions.currentPage;
    const offset = (currentPage - 1) * limit;

    // Step 1: Get total count and top selling product IDs with pagination
    // First, get the total count of products that have sales
    const totalSalesCountResult = await OrderItem.findAll({
      attributes: [
        "productId",
        [sequelize.fn("SUM", sequelize.col("OrderItem.quantity")), "totalSold"],
      ],
      include: [
        {
          model: Order,
          as: "Order",
          where: { storeId },
          required: true,
          attributes: [],
        },
      ],
      group: ["productId"],
      raw: true,
    });

    const totalCount = totalSalesCountResult.length;
    
    // Get paginated product IDs based on sales
    const topProductsData = await OrderItem.findAll({
      attributes: [
        "productId",
        [sequelize.fn("SUM", sequelize.col("OrderItem.quantity")), "totalSold"],
      ],
      include: [
        {
          model: Order,
          as: "Order",
          where: { storeId },
          required: true,
          attributes: [],
        },
      ],
      group: ["productId"],
      order: [[sequelize.literal("totalSold"), "DESC"]],
      limit,
      offset,
      raw: true,
    });

    const topProductIds = topProductsData.map(item => item.productId);
    
    // Create a map of productId to totalSold for quick lookup
    const salesDataMap = {};
    topProductsData.forEach(item => {
      salesDataMap[item.productId] = parseInt(item.totalSold);
    });

    // If no sales data, fallback to recent products with pagination
    if (topProductIds.length === 0) {
      return await getFallbackProducts(req, res, storeId, userId, paginationOptions);
    }

    // If we have fewer products than limit, we don't need to fetch additional products
    // since we're already paginating through top-selling products only
    
    /* ---------------- FETCH PRODUCTS WITH FULL DETAILS ---------------- */
    const products = await Product.findAndCountAll({
      where: { id: { [Sequelize.Op.in]: topProductIds } },
      attributes: [
        "id",
        "sku",
        "title",
        "description",
        "brandName",
        "badge",
        "gstRate",
        "isActive",
        "createdAt",
      ],
      include: [
        { model: Category, as: "Category", attributes: ["id", "name"] },
        { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
        {
          model: ProductCategory,
          as: "ProductCategory",
          attributes: ["id", "name"],
        },
        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id",
            "variantCode",
            "unit",
            "moq",
            "packingType",
            "packQuantity",
            "dispatchType",
            "deliverySla",
            "isActive",
            "totalStock",
            "stockStatus",
          ],
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
            },
            {
              model: ProductPrice,
              as: "price",
              attributes: [
                "id",
                "mrp",
                "sellingPrice",
                "discountPercentage",
                "currency",
              ],
            },
            {
              model: ProductAttribute,
              as: "attributes",
              attributes: ["attributeKey", "attributeValue"],
              required: false,
            },
            {
              model: ProductMeasurement,
              as: "measurements",
              attributes: ["measurementId", "value"],
              include: [
                {
                  model: MeasurementMaster,
                  as: "measurement",
                  attributes: ["id", "name", "unit"],
                },
              ],
            },
          ],
        },
        {
          model: ProductAttribute,
          as: "attributes",
          attributes: ["attributeKey", "attributeValue"],
          required: false,
        },
        {
          model: ProductMeasurement,
          as: "measurements",
          attributes: ["measurementId", "value"],
          include: [
            {
              model: MeasurementMaster,
              as: "measurement",
              attributes: ["id", "name", "unit"],
            },
          ],
        },
        {
          model: OfferApplicableProduct,
          as: "offerApplicableProducts",
          attributes: ["id", "offerId", "subOfferId"],
          include: [
            {
              model: Offer,
              as: "offerDetails",
              attributes: [
                "id",
                "offerCode",
                "title",
                "festival",
                "description",
                "startDate",
                "endDate",
                "isActive",
              ],
              include: [
                {
                  model: OfferSub,
                  as: "subOffers",
                  attributes: [
                    "id",
                    "discountType",
                    "discountValue",
                    "maxDiscount",
                    "minOrderValue",
                  ],
                },
              ],
            },
          ],
        },
      ],
      distinct: true,
    });

    // Reorder products based on top selling order
    const orderedProducts = [];
    for (const id of topProductIds) {
      const product = products.rows.find(p => p.id === id);
      if (product) {
        orderedProducts.push(product);
      }
    }

    /* ---------------- STORE INVENTORY ---------------- */
    const inventory = await StoreInventory.findAll({
      where: { storeId },
    });

    const inventoryMap = {};
    inventory.forEach((inv) => {
      inventoryMap[inv.variantId] = inv.stock;
    });

    /* ---------------- WISHLIST ---------------- */
    let wishlistedMap = {};

    if (userId) {
      const wishlist = await Wishlist.findAll({
        where: { userId },
        attributes: ["productId", "variantId"],
      });

      wishlist.forEach((w) => {
        if (!wishlistedMap[w.productId]) {
          wishlistedMap[w.productId] = [];
        }
        wishlistedMap[w.productId].push(w.variantId);
      });
    }

    /* ---------------- FORMAT RESPONSE ---------------- */
    const finalProducts = orderedProducts.map((p) => {
      const product = p.toJSON();

      // Format Product Level Attributes
      const productAttributes = {};
      (product.attributes || []).forEach((attr) => {
        productAttributes[attr.attributeKey] = attr.attributeValue;
      });

      // Format Product Level Measurements
      const productMeasurements = {};
      (product.measurements || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        productMeasurements[label] = `${m.value}${unit}`;
      });

      product.variants = product.variants.map((variant) => {
        const stock = inventoryMap[variant.id] || 0;

        // Format Variant Level Attributes
        const variantAttributes = {};
        (variant.attributes || []).forEach((attr) => {
          variantAttributes[attr.attributeKey] = attr.attributeValue;
        });

        // Format Variant Level Measurements
        const variantMeasurements = {};
        (variant.measurements || []).forEach((m) => {
          const label = m.measurement?.name || `ID_${m.measurementId}`;
          const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
          variantMeasurements[label] = `${m.value}${unit}`;
        });

        // PRICE CALCULATIONS
        const mrp = variant.price?.mrp || 0;
        const sellingPrice = variant.price?.sellingPrice || 0;
        const gstRate = parseFloat(product.gstRate) || 0;

        const gstAmount = (sellingPrice * gstRate) / 100;
        const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);

        const discount = mrp > 0 ? mrp - sellingPrice : 0;
        const discountPercentage = mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

        return {
          ...variant,
          stock,
          isAvailable: stock > 0,
          totalStock: stock,
          stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
          attributes: variantAttributes,
          measurements: variantMeasurements,
          price: {
            ...(variant.price || {}),
            mrp,
            sellingPrice,
            gstRate,
            gstAmount: Math.round(gstAmount),
            gstInclusiveAmount,
            discount,
            discountPercentage,
          },
        };
      });

      return {
        ...product,
        attributes: productAttributes,
        measurements: productMeasurements,
        isWishlisted: !!wishlistedMap[product.id],
        wishlistedVariants: wishlistedMap[product.id] || [],
        totalSold: salesDataMap[product.id] || 0,
      };
    });

    // Use the same pagination format as getAllProductsDetails
    const response = formatPagination(
      { count: totalCount, rows: finalProducts },
      currentPage,
      limit
    );

    return res.json({
      success: true,
      source: "top-selling",
      ...response,
    });

  } catch (error) {
    console.error("GET TOP SELLING PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function for fallback products with pagination
async function getFallbackProducts(req, res, storeId, userId, paginationOptions) {
  try {
    const { limit, currentPage, offset } = paginationOptions;
    
    // Get total count of active products
    const totalCount = await Product.count({
      where: { isActive: true },
    });

    // Get paginated products
    const products = await Product.findAndCountAll({
      where: { isActive: true },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "sku",
        "title",
        "description",
        "brandName",
        "badge",
        "gstRate",
        "isActive",
        "createdAt",
      ],
      include: [
        { model: Category, as: "Category", attributes: ["id", "name"] },
        { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
        {
          model: ProductCategory,
          as: "ProductCategory",
          attributes: ["id", "name"],
        },
        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id",
            "variantCode",
            "unit",
            "moq",
            "packingType",
            "packQuantity",
            "dispatchType",
            "deliverySla",
            "isActive",
            "totalStock",
            "stockStatus",
          ],
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
            },
            {
              model: ProductPrice,
              as: "price",
              attributes: [
                "id",
                "mrp",
                "sellingPrice",
                "discountPercentage",
                "currency",
              ],
            },
            {
              model: ProductAttribute,
              as: "attributes",
              attributes: ["attributeKey", "attributeValue"],
              required: false,
            },
            {
              model: ProductMeasurement,
              as: "measurements",
              attributes: ["measurementId", "value"],
              include: [
                {
                  model: MeasurementMaster,
                  as: "measurement",
                  attributes: ["id", "name", "unit"],
                },
              ],
            },
          ],
        },
        {
          model: ProductAttribute,
          as: "attributes",
          attributes: ["attributeKey", "attributeValue"],
          required: false,
        },
        {
          model: ProductMeasurement,
          as: "measurements",
          attributes: ["measurementId", "value"],
          include: [
            {
              model: MeasurementMaster,
              as: "measurement",
              attributes: ["id", "name", "unit"],
            },
          ],
        },
        {
          model: OfferApplicableProduct,
          as: "offerApplicableProducts",
          attributes: ["id", "offerId", "subOfferId"],
          include: [
            {
              model: Offer,
              as: "offerDetails",
              attributes: [
                "id",
                "offerCode",
                "title",
                "festival",
                "description",
                "startDate",
                "endDate",
                "isActive",
              ],
              include: [
                {
                  model: OfferSub,
                  as: "subOffers",
                  attributes: [
                    "id",
                    "discountType",
                    "discountValue",
                    "maxDiscount",
                    "minOrderValue",
                  ],
                },
              ],
            },
          ],
        },
      ],
      distinct: true,
    });

    const inventory = await StoreInventory.findAll({
      where: { storeId },
    });

    const inventoryMap = {};
    inventory.forEach((inv) => {
      inventoryMap[inv.variantId] = inv.stock;
    });

    let wishlistedMap = {};
    if (userId) {
      const wishlist = await Wishlist.findAll({
        where: { userId },
        attributes: ["productId", "variantId"],
      });

      wishlist.forEach((w) => {
        if (!wishlistedMap[w.productId]) {
          wishlistedMap[w.productId] = [];
        }
        wishlistedMap[w.productId].push(w.variantId);
      });
    }

    const finalProducts = products.rows.map((p) => {
      const product = p.toJSON();

      const productAttributes = {};
      (product.attributes || []).forEach((attr) => {
        productAttributes[attr.attributeKey] = attr.attributeValue;
      });

      const productMeasurements = {};
      (product.measurements || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        productMeasurements[label] = `${m.value}${unit}`;
      });

      product.variants = product.variants.map((variant) => {
        const stock = inventoryMap[variant.id] || 0;

        const variantAttributes = {};
        (variant.attributes || []).forEach((attr) => {
          variantAttributes[attr.attributeKey] = attr.attributeValue;
        });

        const variantMeasurements = {};
        (variant.measurements || []).forEach((m) => {
          const label = m.measurement?.name || `ID_${m.measurementId}`;
          const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
          variantMeasurements[label] = `${m.value}${unit}`;
        });

        const mrp = variant.price?.mrp || 0;
        const sellingPrice = variant.price?.sellingPrice || 0;
        const gstRate = parseFloat(product.gstRate) || 0;

        const gstAmount = (sellingPrice * gstRate) / 100;
        const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);

        const discount = mrp > 0 ? mrp - sellingPrice : 0;
        const discountPercentage =
          mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

        return {
          ...variant,
          stock,
          isAvailable: stock > 0,
          totalStock: stock,
          stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
          attributes: variantAttributes,
          measurements: variantMeasurements,
          price: {
            ...(variant.price || {}),
            mrp,
            sellingPrice,
            gstRate,
            gstAmount: Math.round(gstAmount),
            gstInclusiveAmount,
            discount,
            discountPercentage,
          },
        };
      });

      return {
        ...product,
        attributes: productAttributes,
        measurements: productMeasurements,
        isWishlisted: !!wishlistedMap[product.id],
        wishlistedVariants: wishlistedMap[product.id] || [],
        totalSold: 0,
      };
    });

    // Use the same pagination format as getAllProductsDetails
    const response = formatPagination(
      { count: totalCount, rows: finalProducts },
      currentPage,
      limit
    );

    return res.json({
      success: true,
      source: "fallback",
      ...response,
    });
  } catch (error) {
    console.error("FALLBACK PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}