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
//       group: ["brandName"],
//       raw: true,
//     });

//     const brands = brandsRaw.map((b) => b.brandName).filter(Boolean);

//     /* ---------------- CATEGORY TREE ---------------- */
//     const categories = await Category.findAll({
//       attributes: ["id", "name", "isActive"],
//       include: [
//         {
//           model: SubCategory,
//           as: "subcategories",
//           attributes: ["id", "name", "isActive"],
//           include: [
//             {
//               model: ProductCategory,
//               as: "productCategories",
//               attributes: ["id", "name", "isActive"],
//             },
//           ],
//         },
//       ],
//     });

//     /* ---------------- COLORS (FIXED FOR TiDB) ---------------- */
//     const colorsRaw = await ProductVariant.findAll({
//       attributes: ["colorName", "colorCode"],
//       group: ["colorName", "colorCode"],
//       raw: true,
//     });

//     const colors = colorsRaw
//       .filter((c) => c.colorName && c.colorCode)
//       .map((c) => ({
//         name: c.colorName,
//         code: c.colorCode,
//       }));

//     /* ---------------- SIZES ---------------- */
//     const sizesRaw = await VariantSize.findAll({
//       attributes: ["diameter", "length"],
//       group: ["diameter", "length"],
//       raw: true,
//     });

//     const sizes = sizesRaw
//       .filter((s) => s.diameter && s.length)
//       .map((s) => ({
//         diameter: s.diameter,
//         length: s.length,
//         display: `M${s.diameter} × ${s.length}`,
//         value: `${s.diameter}-${s.length}`, // for filtering
//       }));

//     /* ---------------- SPECS ---------------- */
//     const specsRaw = await ProductSpec.findAll({
//       attributes: ["specKey", "specValue"],
//       raw: true,
//     });

//     const specs = {};

//     specsRaw.forEach((s) => {
//       if (!specs[s.specKey]) specs[s.specKey] = new Set();

//       s.specValue.split(",").forEach((v) => {
//         specs[s.specKey].add(v.trim());
//       });
//     });

//     Object.keys(specs).forEach((k) => {
//       specs[k] = Array.from(specs[k]);
//     });

//     /* ---------------- PRICE RANGE ---------------- */
//     const priceRaw = await ProductPrice.findOne({
//       attributes: [
//         [sequelize.fn("MIN", sequelize.col("sellingPrice")), "min"],
//         [sequelize.fn("MAX", sequelize.col("sellingPrice")), "max"],
//       ],
//       raw: true,
//     });

//     const priceRange = {
//       min: Number(priceRaw?.min || 0),
//       max: Number(priceRaw?.max || 0),
//     };

//     /* ---------------- AVAILABILITY ---------------- */
//     const availabilityRaw = await ProductVariant.findAll({
//       attributes: ["stockStatus"],
//       group: ["stockStatus"],
//       raw: true,
//     });

//     const availability = availabilityRaw
//       .map((a) => a.stockStatus)
//       .filter(Boolean);

//     /* ---------------- RESPONSE ---------------- */
//     return res.json({
//       success: true,
//       filters: {
//         brands,
//         categories,
//         colors,
//         sizes,
//         specs,
//         priceRange,
//         availability,
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
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantSize = require("../../models/productVariants/variantSize.model");

const { Category, SubCategory, ProductCategory } = require("../../models");

exports.getProductFilters = async (req, res) => {
  try {
    /* ---------------- BRANDS ---------------- */
    const brandsRaw = await Product.findAll({
      attributes: ["brandName"],
      where: {
        brandName: { [Op.ne]: null },
        isActive: true
      },
      group: ["brandName"],
      raw: true,
    });

    const brands = brandsRaw.map((b) => b.brandName).filter(Boolean).sort();

    /* ---------------- CATEGORY TREE ---------------- */
    const categories = await Category.findAll({
      attributes: ["id", "name", "isActive"],
      where: { isActive: true },
      include: [
        {
          model: SubCategory,
          as: "subcategories",
          attributes: ["id", "name", "isActive"],
          where: { isActive: true },
          required: false,
          include: [
            {
              model: ProductCategory,
              as: "productCategories",
              attributes: ["id", "name", "isActive"],
              where: { isActive: true },
              required: false,
            },
          ],
        },
      ],
    });

    /* ---------------- SIZES WITH DIMENSIONS ---------------- */
    const sizesRaw = await VariantSize.findAll({
      attributes: ["diameter", "length"],
      where: {
        diameter: { [Op.ne]: null },
        length: { [Op.ne]: null }
      },
      group: ["diameter", "length"],
      raw: true,
    });

    const sizes = sizesRaw
      .filter((s) => s.diameter && s.length)
      .map((s) => ({
        diameter: s.diameter,
        length: s.length,
        display: `M${s.diameter} × ${s.length}`,
        value: `${s.diameter}-${s.length}`,
      }))
      .sort((a, b) => a.diameter - b.diameter || a.length - b.length);

    /* ---------------- SPECS ---------------- */
    const specsRaw = await ProductSpec.findAll({
      attributes: ["specKey", "specValue"],
      where: {
        specKey: { [Op.ne]: null },
        specValue: { [Op.ne]: null }
      },
      raw: true,
    });

    const specs = {};

    specsRaw.forEach((s) => {
      if (!specs[s.specKey]) specs[s.specKey] = new Set();

      // Split by comma and trim each value
      const values = s.specValue.split(",").map(v => v.trim()).filter(Boolean);
      values.forEach((v) => {
        specs[s.specKey].add(v);
      });
    });

    // Convert Sets to Arrays and sort
    Object.keys(specs).forEach((k) => {
      specs[k] = Array.from(specs[k]).sort();
    });

    /* ---------------- PRICE RANGE ---------------- */
    const priceRaw = await ProductPrice.findOne({
      attributes: [
        [sequelize.fn("MIN", sequelize.col("sellingPrice")), "min"],
        [sequelize.fn("MAX", sequelize.col("sellingPrice")), "max"],
      ],
      where: {
        sellingPrice: { [Op.gt]: 0 }
      },
      raw: true,
    });

    const priceRange = {
      min: Math.floor(Number(priceRaw?.min || 0)),
      max: Math.ceil(Number(priceRaw?.max || 0)),
    };

    /* ---------------- AVAILABILITY (STOCK STATUS) ---------------- */
    const availabilityRaw = await ProductVariant.findAll({
      attributes: ["stockStatus"],
      where: {
        stockStatus: { [Op.ne]: null }
      },
      group: ["stockStatus"],
      raw: true,
    });

    const availability = availabilityRaw
      .map((a) => a.stockStatus)
      .filter(Boolean);

    /* ---------------- VARIANT ATTRIBUTES ---------------- */
    
    // Get unique grades
    const gradesRaw = await ProductVariant.findAll({
      attributes: ["grade"],
      where: {
        grade: { [Op.ne]: null }
      },
      group: ["grade"],
      raw: true,
    });

    const grades = gradesRaw
      .map((g) => Number(g.grade))
      .filter(Boolean)
      .sort((a, b) => a - b);

    // Get unique finishes
    const finishesRaw = await ProductVariant.findAll({
      attributes: ["finish"],
      where: {
        finish: { [Op.ne]: null }
      },
      group: ["finish"],
      raw: true,
    });

    const finishes = finishesRaw
      .map((f) => f.finish)
      .filter(Boolean)
      .sort();

    // Get unique materials
    const materialsRaw = await ProductVariant.findAll({
      attributes: ["material"],
      where: {
        material: { [Op.ne]: null }
      },
      group: ["material"],
      raw: true,
    });

    const materials = materialsRaw
      .map((m) => m.material)
      .filter(Boolean)
      .sort();

    // Get unique thread types
    const threadTypesRaw = await ProductVariant.findAll({
      attributes: ["threadType"],
      where: {
        threadType: { [Op.ne]: null }
      },
      group: ["threadType"],
      raw: true,
    });

    const threadTypes = threadTypesRaw
      .map((t) => t.threadType)
      .filter(Boolean)
      .sort();

    // Get pack quantities
    const packQuantitiesRaw = await ProductVariant.findAll({
      attributes: ["packQuantity"],
      where: {
        packQuantity: { [Op.ne]: null }
      },
      group: ["packQuantity"],
      raw: true,
    });

    const packQuantities = packQuantitiesRaw
      .map((p) => p.packQuantity)
      .filter(Boolean)
      .sort((a, b) => a - b);

    /* ---------------- FILTER SUMMARY ---------------- */
    const filterSummary = {
      totalBrands: brands.length,
      totalCategories: categories.length,
      totalSizes: sizes.length,
      totalSpecs: Object.keys(specs).length,
      totalGrades: grades.length,
      totalFinishes: finishes.length,
      totalMaterials: materials.length,
      totalThreadTypes: threadTypes.length,
      totalPackQuantities: packQuantities.length,
    };

    /* ---------------- RESPONSE ---------------- */
    return res.json({
      success: true,
      filters: {
        brands,
        categories,
        sizes,
        specs,
        priceRange,
        availability,
        // Variant attributes
        variantAttributes: {
          grades,
          finishes,
          materials,
          threadTypes,
          packQuantities,
        },
        summary: filterSummary,
      },
    });
  } catch (error) {
    console.error("FILTER METADATA ERROR:", error);
    
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};