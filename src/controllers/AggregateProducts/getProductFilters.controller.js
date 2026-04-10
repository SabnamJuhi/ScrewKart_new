// const { Op } = require("sequelize");
// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const ProductAttribute = require("../../models/products/ProductAttribute.model");
// const ProductMeasurement = require("../../models/products/ProductMeasurement.model");
// const MeasurementMaster = require("../../models/measurements/MeasurementMaster.model");

// const { Category, SubCategory, ProductCategory, StoreInventory } = require("../../models");

// exports.getProductFilters = async (req, res) => {
//   try {
//     const { storeId } = req.query;

//     if (!storeId) {
//       return res.status(400).json({
//         success: false,
//         message: "storeId is required",
//       });
//     }

//     /* =========================================================
//        1. GET ACTIVE VARIANTS FOR STORE (CORE FILTER BASE)
//     ========================================================= */
//     const storeInventory = await StoreInventory.findAll({
//       where: {
//         storeId,
//         stock: { [Op.gt]: 0 },
//       },
//       attributes: ["variantId"],
//       raw: true,
//     });

//     const availableVariantIds = storeInventory.map((i) => i.variantId);

//     if (!availableVariantIds.length) {
//       return res.json({
//         success: true,
//         filters: {},
//       });
//     }

//     /* =========================================================
//        2. GET PRODUCTS LINKED TO THESE VARIANTS
//     ========================================================= */
//     const variants = await ProductVariant.findAll({
//       where: {
//         id: { [Op.in]: availableVariantIds },
//         isActive: true,
//       },
//       attributes: ["id", "productId", "unit", "packingType", "stockStatus"],
//       raw: true,
//     });

//     const productIds = [...new Set(variants.map((v) => v.productId))];

//     /* =========================================================
//        3. BRANDS
//     ========================================================= */
//     const brandsRaw = await Product.findAll({
//       attributes: [
//         [sequelize.fn("DISTINCT", sequelize.col("brandName")), "brandName"],
//       ],
//       where: {
//         id: { [Op.in]: productIds },
//         isActive: true,
//       },
//       raw: true,
//     });

//     const brands = brandsRaw
//       .map((b) => b.brandName)
//       .filter(Boolean)
//       .sort();

//     /* =========================================================
//        4. CATEGORY TREE
//     ========================================================= */
//     const categories = await Category.findAll({
//       attributes: ["id", "name"],
//       where: { isActive: true },
//       include: [
//         {
//           model: SubCategory,
//           as: "subcategories",
//           attributes: ["id", "name"],
//           include: [
//             {
//               model: ProductCategory,
//               as: "productCategories",
//               attributes: ["id", "name"],
//             },
//           ],
//         },
//       ],
//     });

//     /* =========================================================
//        5. ATTRIBUTES (PRODUCT + VARIANT LEVEL)
//     ========================================================= */
//     const attributesRaw = await ProductAttribute.findAll({
//       where: {
//         [Op.or]: [
//           { productId: { [Op.in]: productIds } },
//           { variantId: { [Op.in]: availableVariantIds } },
//         ],
//       },
//       attributes: ["attributeKey", "attributeValue"],
//       raw: true,
//     });

//     const attributes = {};

//     attributesRaw.forEach((attr) => {
//       if (!attributes[attr.attributeKey]) {
//         attributes[attr.attributeKey] = new Set();
//       }

//       attr.attributeValue
//         .split(",")
//         .map((v) => v.trim())
//         .filter(Boolean)
//         .forEach((v) => attributes[attr.attributeKey].add(v));
//     });

//     Object.keys(attributes).forEach((key) => {
//       attributes[key] = Array.from(attributes[key]).sort();
//     });

//     /* =========================================================
//        6. MEASUREMENTS
//     ========================================================= */
//     const measurementsRaw = await ProductMeasurement.findAll({
//       where: {
//         [Op.or]: [
//           { productId: { [Op.in]: productIds } },
//           { variantId: { [Op.in]: availableVariantIds } },
//         ],
//       },
//       attributes: ["value"],
//       include: [
//         {
//           model: MeasurementMaster,
//           as: "measurement",
//           attributes: ["id", "name", "unit"],
//         },
//       ],
//       raw: true,
//       nest: true,
//     });

//     const measurementsMap = {};

//     measurementsRaw.forEach((m) => {
//       const master = m.measurement;
//       if (!master) return;

//       if (!measurementsMap[master.id]) {
//         measurementsMap[master.id] = {
//           name: master.name,
//           id: master.id,
//           unit: master.unit,
//           values: new Set(),
//         };
//       }

//       measurementsMap[master.id].values.add(m.value);
//     });

//     const measurements = Object.values(measurementsMap).map((m) => ({
//       name: m.name,
//       id: m.id,
//       unit: m.unit,
//       options: Array.from(m.values).sort((a, b) => {
//         const numA = parseFloat(a);
//         const numB = parseFloat(b);

//         if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
//         return a.localeCompare(b);
//       }),
//     }));

//     /* =========================================================
//        7. PRICE RANGE (ONLY AVAILABLE VARIANTS)
//     ========================================================= */
//     const priceRaw = await ProductPrice.findOne({
//       attributes: [
//         [sequelize.fn("MIN", sequelize.col("sellingPrice")), "min"],
//         [sequelize.fn("MAX", sequelize.col("sellingPrice")), "max"],
//       ],
//       where: {
//         variantId: { [Op.in]: availableVariantIds },
//       },
//       raw: true,
//     });

//     const priceRange = {
//       min: Math.floor(Number(priceRaw?.min || 0)),
//       max: Math.ceil(Number(priceRaw?.max || 0)),
//     };

//     /* =========================================================
//        8. VARIANT FILTERS
//     ========================================================= */
//     const units = [...new Set(variants.map((v) => v.unit))]
//       .filter(Boolean)
//       .sort();

//     const packingTypes = [...new Set(variants.map((v) => v.packingType))]
//       .filter(Boolean)
//       .sort();

//     const stockStatus = [...new Set(variants.map((v) => v.stockStatus))]
//       .filter(Boolean)
//       .sort();

//     /* =========================================================
//        FINAL RESPONSE
//     ========================================================= */
//     return res.json({
//       success: true,
//       filters: {
//         brands,
//         categories,
//         priceRange,
//         attributes,
//         measurements,
//         units,
//         packingTypes,
//         stockStatus,
//       },
//     });
//   } catch (error) {
//     console.error("GET PRODUCT FILTERS ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


const { Op } = require("sequelize");
const sequelize = require("../../config/db");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const ProductAttribute = require("../../models/products/ProductAttribute.model");
const ProductMeasurement = require("../../models/products/ProductMeasurement.model");
const MeasurementMaster = require("../../models/measurements/MeasurementMaster.model");

const { Category, SubCategory, ProductCategory } = require("../../models");

exports.getProductFilters = async (req, res) => {
  try {
    const { stockStatus } = req.query;

    /* =========================================================
       1. GET ACTIVE VARIANTS (BASED ON TOTAL STOCK)
    ========================================================= */
    const variantWhere = {
      isActive: true,
    };

    if (stockStatus === "In Stock") {
      variantWhere.totalStock = { [Op.gt]: 0 };
    } else if (stockStatus === "Out of Stock") {
      variantWhere.totalStock = 0;
    }

    const variants = await ProductVariant.findAll({
      where: variantWhere,
      attributes: ["id", "productId", "unit", "packingType", "stockStatus", "totalStock", "packQuantity", "moq"],
      raw: true,
    });

    if (!variants.length) {
      return res.json({
        success: true,
        filters: {
          brands: [],
          categories: [],
          priceRange: { min: 0, max: 0 },
          attributes: {},
          measurements: [],
          units: [],
          packingTypes: [],
          packQuantities: [],
          moqRange: { min: 0, max: 0 },
          stockStatus: [],
          availableCategoryIds: [],
          availableSubCategoryIds: [],
          availableProductCategoryIds: [],
          totalProducts: 0,
          totalVariants: 0,
        },
      });
    }

    const availableVariantIds = variants.map((v) => v.id);
    const productIds = [...new Set(variants.map((v) => v.productId))];

    /* =========================================================
       2. BRANDS
    ========================================================= */
    const brandsRaw = await Product.findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("brandName")), "brandName"],
      ],
      where: {
        id: { [Op.in]: productIds },
        isActive: true,
      },
      raw: true,
    });

    const brands = brandsRaw
      .map((b) => b.brandName)
      .filter(Boolean)
      .sort();

    /* =========================================================
       3. CATEGORY TREE (WITH CIRCULAR REFERENCE FIX)
    ========================================================= */
    const categoriesRaw = await Category.findAll({
      attributes: ["id", "name"],
      where: { isActive: true },
      raw: true,
    });

    const subcategoriesRaw = await SubCategory.findAll({
      attributes: ["id", "name", "categoryId"],
      where: { isActive: true },
      raw: true,
    });

    const productCategoriesRaw = await ProductCategory.findAll({
      attributes: ["id", "name", "subCategoryId"],
      where: { isActive: true },
      raw: true,
    });

    const productsWithCategories = await Product.findAll({
      where: {
        id: { [Op.in]: productIds },
        isActive: true,
      },
      attributes: ["categoryId", "subCategoryId", "productCategoryId"],
      raw: true,
    });

    const availableCategoryIds = [...new Set(productsWithCategories.map(p => p.categoryId).filter(Boolean))];
    const availableSubCategoryIds = [...new Set(productsWithCategories.map(p => p.subCategoryId).filter(Boolean))];
    const availableProductCategoryIds = [...new Set(productsWithCategories.map(p => p.productCategoryId).filter(Boolean))];

    // Build category tree manually
    const categories = categoriesRaw
      .filter(cat => availableCategoryIds.includes(cat.id))
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        subcategories: subcategoriesRaw
          .filter(sub => sub.categoryId === cat.id && availableSubCategoryIds.includes(sub.id))
          .map(sub => ({
            id: sub.id,
            name: sub.name,
            productCategories: productCategoriesRaw
              .filter(pc => pc.subCategoryId === sub.id && availableProductCategoryIds.includes(pc.id))
              .map(pc => ({
                id: pc.id,
                name: pc.name,
              }))
          }))
      }));

    /* =========================================================
       4. ATTRIBUTES
    ========================================================= */
    const attributesRaw = await ProductAttribute.findAll({
      where: {
        [Op.or]: [
          { productId: { [Op.in]: productIds } },
          { variantId: { [Op.in]: availableVariantIds } },
        ],
      },
      attributes: ["attributeKey", "attributeValue"],
      raw: true,
    });

    const attributes = {};

    attributesRaw.forEach((attr) => {
      if (!attributes[attr.attributeKey]) {
        attributes[attr.attributeKey] = new Set();
      }

      attr.attributeValue
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((v) => attributes[attr.attributeKey].add(v));
    });

    Object.keys(attributes).forEach((key) => {
      attributes[key] = Array.from(attributes[key]).sort();
    });

    /* =========================================================
       5. MEASUREMENTS
    ========================================================= */
    const measurementsRaw = await ProductMeasurement.findAll({
      where: {
        [Op.or]: [
          { productId: { [Op.in]: productIds } },
          { variantId: { [Op.in]: availableVariantIds } },
        ],
      },
      attributes: ["value"],
      include: [
        {
          model: MeasurementMaster,
          as: "measurement",
          attributes: ["id", "name", "unit"],
        },
      ],
      raw: true,
      nest: true,
    });

    const measurementsMap = {};

    measurementsRaw.forEach((m) => {
      const master = m.measurement;
      if (!master) return;

      if (!measurementsMap[master.id]) {
        measurementsMap[master.id] = {
          name: master.name,
          id: master.id,
          unit: master.unit,
          values: new Set(),
        };
      }

      measurementsMap[master.id].values.add(m.value);
    });

    const measurements = Object.values(measurementsMap).map((m) => ({
      name: m.name,
      id: m.id,
      unit: m.unit,
      options: Array.from(m.values).sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      }),
    }));

    /* =========================================================
       6. PRICE RANGE
    ========================================================= */
    const priceRaw = await ProductPrice.findOne({
      attributes: [
        [sequelize.fn("MIN", sequelize.col("sellingPrice")), "min"],
        [sequelize.fn("MAX", sequelize.col("sellingPrice")), "max"],
      ],
      where: {
        variantId: { [Op.in]: availableVariantIds },
      },
      raw: true,
    });

    const priceRange = {
      min: Math.floor(Number(priceRaw?.min || 0)),
      max: Math.ceil(Number(priceRaw?.max || 0)),
    };

    /* =========================================================
       7. VARIANT FILTERS
    ========================================================= */
    const units = [...new Set(variants.map((v) => v.unit))]
      .filter(Boolean)
      .sort();

    const packingTypes = [...new Set(variants.map((v) => v.packingType))]
      .filter(Boolean)
      .sort();

    const packQuantities = [...new Set(variants.map((v) => v.packQuantity))]
      .filter(Boolean)
      .sort((a, b) => a - b);

    const moqValues = variants.map(v => v.moq).filter(Boolean);
    const moqRange = {
      min: Math.min(...moqValues) || 0,
      max: Math.max(...moqValues) || 0,
    };

    const stockStatusOptions = [...new Set(variants.map((v) => v.stockStatus))]
      .filter(Boolean)
      .sort();

    /* =========================================================
       8. IN-STOCK COUNT (For filtering by availability)
    ========================================================= */
    const inStockCount = variants.filter(v => v.totalStock > 0).length;
    const outOfStockCount = variants.filter(v => v.totalStock === 0).length;

    /* =========================================================
       9. CATEGORY COUNTS
    ========================================================= */
    const categoryCounts = {};
    productsWithCategories.forEach(product => {
      if (product.categoryId) {
        categoryCounts[product.categoryId] = (categoryCounts[product.categoryId] || 0) + 1;
      }
    });

    /* =========================================================
       10. PRICE DISTRIBUTION (For price slider)
    ========================================================= */
    const allPrices = await ProductPrice.findAll({
      attributes: ["sellingPrice"],
      where: {
        variantId: { [Op.in]: availableVariantIds },
      },
      raw: true,
    });

    const prices = allPrices.map(p => p.sellingPrice).sort((a, b) => a - b);
    
    const priceDistribution = {
      min: priceRange.min,
      max: priceRange.max,
      average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) || 0,
      median: prices[Math.floor(prices.length / 2)] || 0,
      count: prices.length,
    };

    /* =========================================================
       11. MEASUREMENT VALUE RANGES (For numeric measurements)
    ========================================================= */
    const measurementRanges = {};
    measurements.forEach(measurement => {
      const numericValues = measurement.options
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v));
      
      if (numericValues.length > 0) {
        measurementRanges[measurement.name] = {
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          unit: measurement.unit,
        };
      }
    });

    /* =========================================================
       FINAL RESPONSE
    ========================================================= */
    return res.json({
      success: true,
      filters: {
        // Product level filters
        brands,
        categories,
        availableCategoryIds,
        availableSubCategoryIds,
        availableProductCategoryIds,
        categoryCounts,
        
        // Price filters
        priceRange,
        priceDistribution,
        
        // Dynamic filters
        attributes,
        measurements,
        measurementRanges,
        
        // Variant level filters
        units,
        packingTypes,
        packQuantities,
        moqRange,
        stockStatus: stockStatusOptions,
        
        // Stock availability
        stockAvailability: {
          inStock: inStockCount,
          outOfStock: outOfStockCount,
          total: variants.length,
        },
        
        // Additional metadata
        totalProducts: productIds.length,
        totalVariants: availableVariantIds.length,
        
        // Query tips (to help frontend)
        filterExamples: {
          byCategory: "categoryId=1",
          byBrand: "brandName=Unbrako",
          byPrice: "minPrice=100&maxPrice=500",
          byAttribute: "attributeKey=material&attributeValue=SS304",
          byMeasurement: "measurementName=Diameter&measurementValue=20",
          byPackQuantity: "packQuantity=100",
          byUnit: "unit=BOX",
          byMOQ: "moq=10",
          byStockStatus: "stockStatus=In Stock",
          bySearch: "search=bolt",
          combined: "categoryId=1&brandName=Unbrako&minPrice=100&maxPrice=500&attributeKey=material&attributeValue=SS304&measurementName=Diameter&measurementValue=20&stockStatus=In Stock"
        }
      },
    });
  } catch (error) {
    console.error("GET PRODUCT FILTERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};