// const { Op } = require("sequelize");
// const sequelize = require("../../config/db");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");

// const { Category, SubCategory, ProductCategory } = require("../../models");

// exports.getProductFilters = async (req, res) => {
//   try {
//     /* ---------------- BRANDS ---------------- */
//     const brandsRaw = await Product.findAll({
//       attributes: ["brandName"],
//       where: {
//         brandName: { [Op.ne]: null },
//         isActive: true
//       },
//       group: ["brandName"],
//       raw: true,
//     });

//     const brands = brandsRaw.map((b) => b.brandName).filter(Boolean).sort();

//     /* ---------------- CATEGORY TREE ---------------- */
//     const categories = await Category.findAll({
//       attributes: ["id", "name", "isActive"],
//       where: { isActive: true },
//       include: [
//         {
//           model: SubCategory,
//           as: "subcategories",
//           attributes: ["id", "name", "isActive"],
//           where: { isActive: true },
//           required: false,
//           include: [
//             {
//               model: ProductCategory,
//               as: "productCategories",
//               attributes: ["id", "name", "isActive"],
//               where: { isActive: true },
//               required: false,
//             },
//           ],
//         },
//       ],
//     });

//     /* ---------------- SIZES WITH DIMENSIONS ---------------- */
//     const sizesRaw = await VariantSize.findAll({
//       attributes: ["diameter", "length"],
//       where: {
//         diameter: { [Op.ne]: null },
//         length: { [Op.ne]: null }
//       },
//       group: ["diameter", "length"],
//       raw: true,
//     });

//     const sizes = sizesRaw
//       .filter((s) => s.diameter && s.length)
//       .map((s) => ({
//         diameter: s.diameter,
//         length: s.length,
//         display: `M${s.diameter} × ${s.length}`,
//         value: `${s.diameter}-${s.length}`,
//       }))
//       .sort((a, b) => a.diameter - b.diameter || a.length - b.length);

//     /* ---------------- SPECS ---------------- */
//     const specsRaw = await ProductSpec.findAll({
//       attributes: ["specKey", "specValue"],
//       where: {
//         specKey: { [Op.ne]: null },
//         specValue: { [Op.ne]: null }
//       },
//       raw: true,
//     });

//     const specs = {};

//     specsRaw.forEach((s) => {
//       if (!specs[s.specKey]) specs[s.specKey] = new Set();

//       // Split by comma and trim each value
//       const values = s.specValue.split(",").map(v => v.trim()).filter(Boolean);
//       values.forEach((v) => {
//         specs[s.specKey].add(v);
//       });
//     });

//     // Convert Sets to Arrays and sort
//     Object.keys(specs).forEach((k) => {
//       specs[k] = Array.from(specs[k]).sort();
//     });

//     /* ---------------- PRICE RANGE ---------------- */
//     const priceRaw = await ProductPrice.findOne({
//       attributes: [
//         [sequelize.fn("MIN", sequelize.col("sellingPrice")), "min"],
//         [sequelize.fn("MAX", sequelize.col("sellingPrice")), "max"],
//       ],
//       where: {
//         sellingPrice: { [Op.gt]: 0 }
//       },
//       raw: true,
//     });

//     const priceRange = {
//       min: Math.floor(Number(priceRaw?.min || 0)),
//       max: Math.ceil(Number(priceRaw?.max || 0)),
//     };

//     /* ---------------- AVAILABILITY (STOCK STATUS) ---------------- */
//     const availabilityRaw = await ProductVariant.findAll({
//       attributes: ["stockStatus"],
//       where: {
//         stockStatus: { [Op.ne]: null }
//       },
//       group: ["stockStatus"],
//       raw: true,
//     });

//     const availability = availabilityRaw
//       .map((a) => a.stockStatus)
//       .filter(Boolean);

//     /* ---------------- VARIANT ATTRIBUTES ---------------- */
    
//     // Get unique grades
//     const gradesRaw = await ProductVariant.findAll({
//       attributes: ["grade"],
//       where: {
//         grade: { [Op.ne]: null }
//       },
//       group: ["grade"],
//       raw: true,
//     });

//     const grades = gradesRaw
//       .map((g) => Number(g.grade))
//       .filter(Boolean)
//       .sort((a, b) => a - b);

//     // Get unique finishes
//     const finishesRaw = await ProductVariant.findAll({
//       attributes: ["finish"],
//       where: {
//         finish: { [Op.ne]: null }
//       },
//       group: ["finish"],
//       raw: true,
//     });

//     const finishes = finishesRaw
//       .map((f) => f.finish)
//       .filter(Boolean)
//       .sort();

//     // Get unique materials
//     const materialsRaw = await ProductVariant.findAll({
//       attributes: ["material"],
//       where: {
//         material: { [Op.ne]: null }
//       },
//       group: ["material"],
//       raw: true,
//     });

//     const materials = materialsRaw
//       .map((m) => m.material)
//       .filter(Boolean)
//       .sort();

//     // Get unique thread types
//     const threadTypesRaw = await ProductVariant.findAll({
//       attributes: ["threadType"],
//       where: {
//         threadType: { [Op.ne]: null }
//       },
//       group: ["threadType"],
//       raw: true,
//     });

//     const threadTypes = threadTypesRaw
//       .map((t) => t.threadType)
//       .filter(Boolean)
//       .sort();

//     // Get pack quantities
//     const packQuantitiesRaw = await ProductVariant.findAll({
//       attributes: ["packQuantity"],
//       where: {
//         packQuantity: { [Op.ne]: null }
//       },
//       group: ["packQuantity"],
//       raw: true,
//     });

//     const packQuantities = packQuantitiesRaw
//       .map((p) => p.packQuantity)
//       .filter(Boolean)
//       .sort((a, b) => a - b);

//     /* ---------------- FILTER SUMMARY ---------------- */
//     const filterSummary = {
//       totalBrands: brands.length,
//       totalCategories: categories.length,
//       totalSizes: sizes.length,
//       totalSpecs: Object.keys(specs).length,
//       totalGrades: grades.length,
//       totalFinishes: finishes.length,
//       totalMaterials: materials.length,
//       totalThreadTypes: threadTypes.length,
//       totalPackQuantities: packQuantities.length,
//     };

//     /* ---------------- RESPONSE ---------------- */
//     return res.json({
//       success: true,
//       filters: {
//         brands,
//         categories,
//         sizes,
//         specs,
//         priceRange,
//         availability,
//         // Variant attributes
//         variantAttributes: {
//           grades,
//           finishes,
//           materials,
//           threadTypes,
//           packQuantities,
//         },
//         summary: filterSummary,
//       },
//     });
//   } catch (error) {
//     console.error("FILTER METADATA ERROR:", error);
    
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
    /* ---------------- 1. BRANDS ---------------- */
    const brandsRaw = await Product.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("brandName")), "brandName"]],
      where: { brandName: { [Op.ne]: null }, isActive: true },
      raw: true,
    });
    const brands = brandsRaw.map((b) => b.brandName).filter(Boolean).sort();

    /* ---------------- 2. CATEGORY TREE ---------------- */
    const categories = await Category.findAll({
      attributes: ["id", "name"],
      where: { isActive: true },
      include: [
        {
          model: SubCategory,
          as: "subcategories",
          attributes: ["id", "name"],
          include: [{ model: ProductCategory, as: "productCategories", attributes: ["id", "name"] }],
        },
      ],
    });

    /* ---------------- 3. DYNAMIC ATTRIBUTES (Global & Variant) ---------------- */
    const attributesRaw = await ProductAttribute.findAll({
      attributes: ["attributeKey", "attributeValue"],
      raw: true,
    });

    const attributes = {};
    attributesRaw.forEach((attr) => {
      if (!attributes[attr.attributeKey]) attributes[attr.attributeKey] = new Set();
      // Split by comma if multiple values are stored, otherwise add direct
      attr.attributeValue.split(",").forEach(v => attributes[attr.attributeKey].add(v.trim()));
    });
    
    // Convert Sets to sorted Arrays
    Object.keys(attributes).forEach(key => {
      attributes[key] = Array.from(attributes[key]).filter(Boolean).sort();
    });

    /* ---------------- 4. DYNAMIC MEASUREMENTS ---------------- */
    const measurementsRaw = await ProductMeasurement.findAll({
      attributes: ["value"],
      include: [{ 
        model: MeasurementMaster, 
        as: "measurement", 
        attributes: ["id", "name", "unit"] 
      }],
      raw: true,
      nest: true // Keeps the included model nested for easy access
    });

    const measurements = {};
    measurementsRaw.forEach((m) => {
      const master = m.measurement;
      if (!master) return;
      
      const key = master.name; // e.g., "Length"
      if (!measurements[key]) {
        measurements[key] = {
          id: master.id,
          unit: master.unit,
          values: new Set()
        };
      }
      measurements[key].values.add(m.value);
    });

    // Final formatting for measurements
    const formattedMeasurements = Object.keys(measurements).map(key => ({
      name: key,
      id: measurements[key].id,
      unit: measurements[key].unit,
      options: Array.from(measurements[key].values).sort((a, b) => parseFloat(a) - parseFloat(b))
    }));

    /* ---------------- 5. PRICE RANGE ---------------- */
    const priceRaw = await ProductPrice.findOne({
      attributes: [
        [sequelize.fn("MIN", sequelize.col("sellingPrice")), "min"],
        [sequelize.fn("MAX", sequelize.col("sellingPrice")), "max"],
      ],
      raw: true,
    });

    /* ---------------- 6. VARIANT SPECIFICS ---------------- */
    const variantMeta = await ProductVariant.findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("unit")), "unit"],
        [sequelize.fn("DISTINCT", sequelize.col("packingType")), "packingType"],
        [sequelize.fn("DISTINCT", sequelize.col("stockStatus")), "stockStatus"],
      ],
      raw: true,
    });

    /* ---------------- RESPONSE ---------------- */
    return res.json({
      success: true,
      filters: {
        brands,
        categories,
        priceRange: {
          min: Math.floor(Number(priceRaw?.min || 0)),
          max: Math.ceil(Number(priceRaw?.max || 0)),
        },
        attributes, // Dynamic keys like "Material", "Finish", etc.
        measurements: formattedMeasurements, // Dynamic keys like "Diameter", "Length"
        stockStatus: Array.from(new Set(variantMeta.map(v => v.stockStatus))).filter(Boolean),
        packingTypes: Array.from(new Set(variantMeta.map(v => v.packingType))).filter(Boolean),
        units: Array.from(new Set(variantMeta.map(v => v.unit))).filter(Boolean)
      },
    });
  } catch (error) {
    console.error("DYNAMIC FILTER ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};