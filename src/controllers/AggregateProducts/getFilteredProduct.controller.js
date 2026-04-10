const {
  Product,
  ProductVariant,
  VariantImage,
  ProductAttribute,
  ProductMeasurement,
  MeasurementMaster,
  ProductPrice,
  Wishlist,
  Category,
  SubCategory,
  ProductCategory
} = require("../../models");

const { Op, Sequelize } = require("sequelize");

const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.getFilteredProducts = async (req, res) => {
  try {
    const query = req.query;
    const userId = req.user?.id;

    const { limit, offset, currentPage } = getPaginationOptions(req.query);

    // =========================
    // 🔹 1. PRODUCT FILTERS
    // =========================
    const productWhere = {};
    
    if (query.isActive !== undefined) {
      productWhere.isActive = query.isActive === "true";
    }

    if (query.categoryId) productWhere.categoryId = query.categoryId;
    if (query.subCategoryId) productWhere.subCategoryId = query.subCategoryId;
    if (query.productCategoryId) productWhere.productCategoryId = query.productCategoryId;

    if (query.brandName) {
      productWhere.brandName = {
        [Op.like]: `%${query.brandName}%`,
      };
    }

    if (query.search) {
      productWhere[Op.or] = [
        { title: { [Op.like]: `%${query.search}%` } },
        { sku: { [Op.like]: `%${query.search}%` } },
        { brandName: { [Op.like]: `%${query.search}%` } },
      ];
    }

    // =========================
    // 🔹 2. VARIANT FILTERS
    // =========================
    const variantWhere = {};

    if (query.packQuantity) variantWhere.packQuantity = query.packQuantity;
    if (query.unit) variantWhere.unit = query.unit;
    if (query.moq) variantWhere.moq = { [Op.gte]: parseInt(query.moq) };
    if (query.variantCode) variantWhere.variantCode = { [Op.like]: `%${query.variantCode}%` };
    if (query.isActive !== undefined) variantWhere.isActive = query.isActive === "true";
    
    // Stock status filter
    if (query.stockStatus === "In Stock") {
      variantWhere.totalStock = { [Op.gt]: 0 };
    } else if (query.stockStatus === "Out of Stock") {
      variantWhere.totalStock = 0;
    }

    // =========================
    // 🔹 3. ATTRIBUTE FILTERS
    // =========================
    let attributeConditions = [];
    let attributeRequired = false;
    
    if (query.attributeKey && query.attributeValue) {
      attributeConditions = [{
        attributeKey: query.attributeKey,
        attributeValue: query.attributeValue
      }];
      attributeRequired = true;
    } else if (query.attributes) {
      attributeConditions = Object.entries(query.attributes).map(
        ([key, value]) => ({
          attributeKey: key,
          attributeValue: value
        })
      );
      attributeRequired = true;
    } else if (query.attributeFilters) {
      attributeConditions = query.attributeFilters.split(',').map(filter => {
        const [key, value] = filter.split(':');
        return { attributeKey: key, attributeValue: value };
      });
      attributeRequired = true;
    }

    // =========================
    // 🔹 4. MEASUREMENT FILTERS (FIXED)
    // =========================
    let measurementConditions = [];
    let measurementRequired = false;
    
    if (query.measurementName && query.measurementValue) {
      measurementConditions = [{
        measurementName: query.measurementName,
        measurementValue: query.measurementValue
      }];
      measurementRequired = true;
    } else if (query.measurements) {
      measurementConditions = Object.entries(query.measurements).map(
        ([key, value]) => ({
          measurementName: key,
          measurementValue: value
        })
      );
      measurementRequired = true;
    } else if (query.measurementFilters) {
      measurementConditions = query.measurementFilters.split(',').map(filter => {
        const [name, value] = filter.split(':');
        return {
          measurementName: name,
          measurementValue: value
        };
      });
      measurementRequired = true;
    }

    // =========================
    // 🔹 5. PRICE FILTER
    // =========================
    let priceWhere = {};
    if (query.minPrice || query.maxPrice) {
      if (query.minPrice && query.maxPrice) {
        priceWhere.sellingPrice = {
          [Op.between]: [parseFloat(query.minPrice), parseFloat(query.maxPrice)]
        };
      } else if (query.minPrice) {
        priceWhere.sellingPrice = { [Op.gte]: parseFloat(query.minPrice) };
      } else if (query.maxPrice) {
        priceWhere.sellingPrice = { [Op.lte]: parseFloat(query.maxPrice) };
      }
    }

    // =========================
    // 🔹 6. DATE FILTERS
    // =========================
    if (query.fromDate && query.toDate) {
      productWhere.createdAt = {
        [Op.between]: [new Date(query.fromDate), new Date(query.toDate)]
      };
    }

    // =========================
    // 🔥 GET PRODUCT IDs THAT MATCH MEASUREMENT CONDITIONS (FIXED)
    // =========================
    let filteredProductIds = null;
    
    // Handle attribute filtering
    if (attributeConditions.length > 0) {
      let productIdsPerCondition = [];
      
      for (const condition of attributeConditions) {
        const productLevelProducts = await ProductAttribute.findAll({
          where: {
            attributeKey: condition.attributeKey,
            attributeValue: condition.attributeValue,
            productId: { [Op.ne]: null }
          },
          attributes: ['productId'],
          raw: true
        });
        
        const variantLevelProducts = await ProductAttribute.findAll({
          where: {
            attributeKey: condition.attributeKey,
            attributeValue: condition.attributeValue,
            variantId: { [Op.ne]: null }
          },
          attributes: ['variantId'],
          include: [{
            model: ProductVariant,
            as: 'variant',
            attributes: ['productId'],
            required: true
          }],
          raw: true
        });
        
        const productIds = new Set();
        
        productLevelProducts.forEach(p => {
          if (p.productId) productIds.add(p.productId);
        });
        
        variantLevelProducts.forEach(v => {
          if (v['variant.productId']) productIds.add(v['variant.productId']);
        });
        
        productIdsPerCondition.push(Array.from(productIds));
      }
      
      if (productIdsPerCondition.length > 0) {
        filteredProductIds = productIdsPerCondition.reduce((intersection, ids) => {
          return intersection.filter(id => ids.includes(id));
        }, productIdsPerCondition[0]);
      }
      
      if (!filteredProductIds || filteredProductIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage,
            pageSize: limit,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
      }
    }
    
    // Handle measurement filtering (FIXED - using separate query)
    if (measurementConditions.length > 0) {
      let productIdsPerCondition = [];
      
      for (const condition of measurementConditions) {
        // Get product IDs from product-level measurements
        const productLevelMeasurements = await ProductMeasurement.findAll({
          where: {
            value: condition.measurementValue
          },
          include: [{
            model: MeasurementMaster,
            as: 'measurement',
            where: {
              name: condition.measurementName
            },
            attributes: []
          }],
          attributes: ['productId'],
          where: {
            productId: { [Op.ne]: null },
            value: condition.measurementValue
          },
          raw: true
        });
        
        // Get product IDs from variant-level measurements
        const variantLevelMeasurements = await ProductMeasurement.findAll({
          where: {
            value: condition.measurementValue,
            variantId: { [Op.ne]: null }
          },
          include: [{
            model: MeasurementMaster,
            as: 'measurement',
            where: {
              name: condition.measurementName
            },
            attributes: []
          }, {
            model: ProductVariant,
            as: 'variant',
            attributes: ['productId'],
            required: true
          }],
          attributes: ['variantId'],
          raw: true
        });
        
        const productIds = new Set();
        
        productLevelMeasurements.forEach(p => {
          if (p.productId) productIds.add(p.productId);
        });
        
        variantLevelMeasurements.forEach(v => {
          if (v['variant.productId']) productIds.add(v['variant.productId']);
        });
        
        productIdsPerCondition.push(Array.from(productIds));
      }
      
      if (productIdsPerCondition.length > 0) {
        const measurementProductIds = productIdsPerCondition.reduce((intersection, ids) => {
          return intersection.filter(id => ids.includes(id));
        }, productIdsPerCondition[0]);
        
        if (filteredProductIds) {
          // Intersection of attribute and measurement filters
          filteredProductIds = filteredProductIds.filter(id => measurementProductIds.includes(id));
        } else {
          filteredProductIds = measurementProductIds;
        }
      }
      
      if (!filteredProductIds || filteredProductIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage,
            pageSize: limit,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
      }
    }
    
    // Apply product ID filter if we have filtered IDs
    if (filteredProductIds) {
      productWhere.id = { [Op.in]: filteredProductIds };
    }

    // =========================
    // 🔥 MAIN PRODUCTS QUERY
    // =========================
    const products = await Product.findAndCountAll({
      where: productWhere,
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
      distinct: true,
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
          required: true,
          where: variantWhere,
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
              required: !!(query.minPrice || query.maxPrice),
              where: Object.keys(priceWhere).length ? priceWhere : undefined,
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
              required: false,
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
          required: false,
          include: [
            {
              model: MeasurementMaster,
              as: "measurement",
              attributes: ["id", "name", "unit"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // =========================
    // ❤️ WISHLIST
    // =========================
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

    // =========================
    // 🔹 FORMAT FUNCTIONS
    // =========================
    const formatAttributes = (arr) => {
      const obj = {};
      (arr || []).forEach((item) => {
        obj[item.attributeKey] = item.attributeValue;
      });
      return obj;
    };

    const formatMeasurements = (arr) => {
      const obj = {};
      (arr || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        obj[label] = `${m.value}${unit}`;
      });
      return obj;
    };

    // =========================
    // 🔹 FORMAT FINAL DATA
    // =========================
    const finalProducts = products.rows.map((p) => {
      const product = p.toJSON();

      // Format Product Level Attributes
      const productAttributes = formatAttributes(product.attributes);
      const productMeasurements = formatMeasurements(product.measurements);

      // Format Variants
      const formattedVariants = (product.variants || []).map((variant) => {
        const variantAttributes = formatAttributes(variant.attributes);
        const variantMeasurements = formatMeasurements(variant.measurements);

        // PRICE CALCULATIONS
        const mrp = variant.price?.mrp || 0;
        const sellingPrice = variant.price?.sellingPrice || 0;
        const gstRate = parseFloat(product.gstRate) || 0;

        const gstAmount = (sellingPrice * gstRate) / 100;
        const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);

        const discount = mrp > 0 ? mrp - sellingPrice : 0;
        const discountPercentage = mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

        // Use variant's own totalStock
        const stock = variant.totalStock || 0;

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
          isWishlisted: (wishlistedMap[product.id] || []).includes(variant.id),
        };
      });

      return {
        ...product,
        variants: formattedVariants,
        attributes: productAttributes,
        measurements: productMeasurements,
        isWishlisted: !!wishlistedMap[product.id],
        wishlistedVariants: wishlistedMap[product.id] || [],
      };
    });

    // =========================
    // 📄 PAGINATION RESPONSE
    // =========================
    const response = formatPagination(
      { count: products.count, rows: finalProducts },
      currentPage,
      limit
    );

    return res.json({
      success: true,
      ...response,
    });
  } catch (err) {
    console.error("GET FILTERED PRODUCTS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};