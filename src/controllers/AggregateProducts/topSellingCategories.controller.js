// const {
//   OrderItem,
//   Product,
//   Category,
//   SubCategory,
//   ProductCategory,
//   StoreInventory,
//   Wishlist,
//   Order,
//   ProductPrice,
//   VariantImage,
//   ProductVariant,
// } = require("../../models");
// const { Sequelize } = require("sequelize");
// const sequelize = require("../../config/db");
// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

// exports.getTopSellingCategories = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const { storeId } = req.query;
    
//     if (!storeId) {
//       return res.status(400).json({
//         success: false,
//         message: "storeId is required",
//       });
//     }

//     // Get pagination options
//     const paginationOptions = getPaginationOptions(req.query);
//     const { limit, currentPage, offset } = paginationOptions;

//     // Step 1: Get top selling categories based on order items filtered by store
//     const topCategoriesData = await OrderItem.findAll({
//       attributes: [
//         [sequelize.col("product.categoryId"), "categoryId"],
//         [sequelize.fn("SUM", sequelize.col("OrderItem.quantity")), "totalSold"],
//       ],
//       include: [
//         {
//           model: Order,
//           as: "Order",
//           where: { storeId },
//           required: true,
//           attributes: [],
//         },
//         {
//           model: Product,
//           as: "Product",
//           required: true,
//           attributes: [],
//           where: {
//             isActive: true,
//           },
//         },
//       ],
//       group: ["product.categoryId"],
//       having: sequelize.where(sequelize.col("product.categoryId"), "IS NOT", null),
//       order: [[sequelize.literal("totalSold"), "DESC"]],
//       raw: true,
//     });

//     // Get total count of categories with sales
//     const totalCount = topCategoriesData.length;
    
//     // Apply pagination manually since we can't use limit/offset with group by easily
//     const paginatedCategoriesData = topCategoriesData.slice(offset, offset + limit);
    
//     const categoryIds = paginatedCategoriesData.map(item => item.categoryId).filter(id => id);
    
//     // Create a map of categoryId to totalSold
//     const salesDataMap = {};
//     paginatedCategoriesData.forEach(item => {
//       salesDataMap[item.categoryId] = parseInt(item.totalSold);
//     });

//     // If no sales data, fallback to recent categories
//     if (categoryIds.length === 0) {
//       return await getFallbackCategories(req, res, storeId, paginationOptions);
//     }

//     /* ---------------- FETCH CATEGORIES WITH PRODUCT DETAILS ---------------- */
//     const categories = await Category.findAndCountAll({
//       where: { id: { [Sequelize.Op.in]: categoryIds } },
//       attributes: ["id", "name", "isActive", "createdAt"],
//       include: [
//         {
//           model: SubCategory,
//           as: "subcategories",
//           attributes: ["id", "name", "isActive"],
//           required: false,
//         },
//         {
//           model: Product,
//           as: "Products",
//           attributes: [
//             "id",
//             "sku",
//             "title",
//             "description",
//             "brandName",
//             "badge",
//             "gstRate",
//             "isActive",
//           ],
//           through: { attributes: [] }, // For ProductCategory junction table
//           required: false,
//           include: [
//             {
//               model: ProductVariant,
//               as: "variants",
//               attributes: [
//                 "id",
//                 "variantCode",
//                 "unit",
//                 "moq",
//                 "packingType",
//                 "packQuantity",
//                 "dispatchType",
//                 "deliverySla",
//                 "isActive",
//                 "totalStock",
//                 "stockStatus",
//               ],
//               required: false,
//               include: [
//                 {
//                   model: VariantImage,
//                   as: "images",
//                   attributes: ["id", "imageUrl"],
//                 },
//                 {
//                   model: ProductPrice,
//                   as: "price",
//                   attributes: [
//                     "id",
//                     "mrp",
//                     "sellingPrice",
//                     "discountPercentage",
//                     "currency",
//                   ],
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//       distinct: true,
//     });

//     // Reorder categories based on top selling order
//     const orderedCategories = [];
//     for (const id of categoryIds) {
//       const category = categories.rows.find(c => c.id === id);
//       if (category) {
//         orderedCategories.push(category);
//       }
//     }

//     /* ---------------- STORE INVENTORY FOR PRODUCTS ---------------- */
//     // Get all product variants from these categories to check inventory
//     const allProductIds = [];
//     orderedCategories.forEach(category => {
//       if (category.Products) {
//         category.Products.forEach(product => {
//           allProductIds.push(product.id);
//         });
//       }
//     });

//     // Get all variants for these products
//     const allVariants = await ProductVariant.findAll({
//       where: { productId: { [Sequelize.Op.in]: allProductIds } },
//       attributes: ["id", "productId"],
//     });

//     const variantIds = allVariants.map(v => v.id);

//     const inventory = await StoreInventory.findAll({
//       where: { 
//         storeId,
//         variantId: { [Sequelize.Op.in]: variantIds }
//       },
//     });

//     const inventoryMap = {};
//     inventory.forEach((inv) => {
//       inventoryMap[inv.variantId] = inv.stock;
//     });

//     /* ---------------- WISHLIST ---------------- */
//     let wishlistedMap = {};

//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId },
//         attributes: ["productId", "variantId"],
//       });

//       wishlist.forEach((w) => {
//         if (!wishlistedMap[w.productId]) {
//           wishlistedMap[w.productId] = [];
//         }
//         wishlistedMap[w.productId].push(w.variantId);
//       });
//     }

//     /* ---------------- FORMAT RESPONSE ---------------- */
//     const finalCategories = orderedCategories.map((category) => {
//       const cat = category.toJSON();
      
//       // Get first product image for category
//       let categoryImage = null;
      
//       // Format products within category
//       if (cat.Products && cat.Products.length > 0) {
//         cat.Products = cat.Products.map((product) => {
//           // Format variants with inventory and wishlist
//           if (product.variants) {
//             product.variants = product.variants.map((variant) => {
//               const stock = inventoryMap[variant.id] || 0;
              
//               // Price calculations
//               const mrp = variant.price?.mrp || 0;
//               const sellingPrice = variant.price?.sellingPrice || 0;
//               const gstRate = parseFloat(product.gstRate) || 0;
              
//               const gstAmount = (sellingPrice * gstRate) / 100;
//               const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);
//               const discount = mrp > 0 ? mrp - sellingPrice : 0;
//               const discountPercentage = mrp > 0 ? Math.round((discount / mrp) * 100) : 0;
              
//               return {
//                 ...variant,
//                 stock,
//                 isAvailable: stock > 0,
//                 totalStock: stock,
//                 stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
//                 price: {
//                   ...(variant.price || {}),
//                   mrp,
//                   sellingPrice,
//                   gstRate,
//                   gstAmount: Math.round(gstAmount),
//                   gstInclusiveAmount,
//                   discount,
//                   discountPercentage,
//                 },
//               };
//             });
//           }
          
//           return {
//             ...product,
//             isWishlisted: !!wishlistedMap[product.id],
//             wishlistedVariants: wishlistedMap[product.id] || [],
//           };
//         });
        
//         // Get the first product's first variant's first image
//         const firstProduct = cat.Products[0];
//         if (firstProduct && firstProduct.variants && firstProduct.variants.length > 0) {
//           const firstVariant = firstProduct.variants[0];
//           if (firstVariant.images && firstVariant.images.length > 0) {
//             categoryImage = firstVariant.images[0].imageUrl;
//           }
//         }
//       }
      
//       return {
//         ...cat,
//         totalSold: salesDataMap[cat.id] || 0,
//         categoryImage, // Add the first product image for the category
//       };
//     });

//     // Use the same pagination format
//     const response = formatPagination(
//       { count: totalCount, rows: finalCategories },
//       currentPage,
//       limit
//     );

//     return res.json({
//       success: true,
//       source: "top-selling-categories",
//       ...response,
//     });

//   } catch (error) {
//     console.error("GET TOP SELLING CATEGORIES ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Helper function for fallback categories
// async function getFallbackCategories(req, res, storeId, paginationOptions) {
//   try {
//     const { limit, currentPage, offset } = paginationOptions;
    
//     const totalCount = await Category.count({
//       where: { isActive: true },
//     });

//     const categories = await Category.findAll({
//       where: { isActive: true },
//       limit,
//       offset,
//       order: [["createdAt", "DESC"]],
//       attributes: ["id", "name", "isActive", "createdAt"],
//       include: [
//         {
//           model: SubCategory,
//           as: "subcategories",
//           attributes: ["id", "name", "isActive"],
//           required: false,
//         },
//         {
//           model: Product,
//           as: "Products",
//           attributes: ["id"],
//           through: { attributes: [] },
//           required: false,
//           include: [
//             {
//               model: ProductVariant,
//               as: "variants",
//               attributes: ["id"],
//               required: false,
//               include: [
//                 {
//                   model: VariantImage,
//                   as: "images",
//                   attributes: ["imageUrl"],
//                   limit: 1,
//                 },
//               ],
//             },
//           ],
//           limit: 1, // Get only first product for image
//         },
//       ],
//       distinct: true,
//     });

//     // Format categories with images for fallback
//     const formattedCategories = categories.map(category => {
//       const cat = category.toJSON();
//       let categoryImage = null;
      
//       // Get first product's first variant's first image
//       if (cat.Products && cat.Products.length > 0) {
//         const firstProduct = cat.Products[0];
//         if (firstProduct.variants && firstProduct.variants.length > 0) {
//           const firstVariant = firstProduct.variants[0];
//           if (firstVariant.images && firstVariant.images.length > 0) {
//             categoryImage = firstVariant.images[0].imageUrl;
//           }
//         }
//       }
      
//       return {
//         ...cat,
//         categoryImage,
//       };
//     });

//     const response = formatPagination(
//       { count: totalCount, rows: formattedCategories },
//       currentPage,
//       limit
//     );

//     return res.json({
//       success: true,
//       source: "fallback-categories",
//       ...response,
//     });
//   } catch (error) {
//     console.error("FALLBACK CATEGORIES ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }



const {
  OrderItem,
  Product,
  Category,
  SubCategory,
  ProductCategory,
  StoreInventory,
  Wishlist,
  Order,
  ProductPrice,
  VariantImage,
  ProductVariant,
} = require("../../models");
const { Sequelize } = require("sequelize");
const sequelize = require("../../config/db");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.getTopSellingCategories = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "storeId is required",
      });
    }

    // Get pagination options
    const paginationOptions = getPaginationOptions(req.query);
    const { limit, currentPage, offset } = paginationOptions;

    // Step 1: Get top selling categories based on order items filtered by store
    const topCategoriesData = await OrderItem.findAll({
      attributes: [
        [sequelize.col("Product.categoryId"), "categoryId"],
        [sequelize.fn("SUM", sequelize.col("OrderItem.quantity")), "totalSold"],
      ],
      include: [
        {
          model: Order,
          required: true,
          where: { storeId },
          attributes: [],
        },
        {
          model: Product,
          required: true,
          attributes: [],
          where: {
            isActive: true,
          },
        },
      ],
      group: ["Product.categoryId"],
      having: sequelize.where(sequelize.col("Product.categoryId"), "IS NOT", null),
      order: [[sequelize.literal("totalSold"), "DESC"]],
      raw: true,
    });

    // Get total count of categories with sales
    const totalCount = topCategoriesData.length;
    
    // Apply pagination manually
    const paginatedCategoriesData = topCategoriesData.slice(offset, offset + limit);
    
    const categoryIds = paginatedCategoriesData.map(item => item.categoryId).filter(id => id);
    
    // Create a map of categoryId to totalSold
    const salesDataMap = {};
    paginatedCategoriesData.forEach(item => {
      salesDataMap[item.categoryId] = parseInt(item.totalSold);
    });

    // If no sales data, fallback to recent categories
    if (categoryIds.length === 0) {
      return await getFallbackCategories(req, res, storeId, paginationOptions);
    }

    /* ---------------- FETCH CATEGORIES ---------------- */
    const categories = await Category.findAll({
      where: { id: { [Sequelize.Op.in]: categoryIds } },
      attributes: ["id", "name", "isActive", "createdAt"],
      include: [
        {
          model: SubCategory,
          as: "subcategories", // Match your association: Category.hasMany(SubCategory, {as: "subcategories"})
          attributes: ["id", "name", "isActive"],
          required: false,
        },
      ],
    });

    // Fetch products for these categories using ProductCategory junction table
    const productsForCategories = await ProductCategory.findAll({
      where: { categoryId: { [Sequelize.Op.in]: categoryIds } },
      include: [
        {
          model: Product,
          required: false,
          where: { isActive: true },
          attributes: [
            "id",
            "sku",
            "title",
            "description",
            "brandName",
            "badge",
            "gstRate",
            "isActive",
          ],
          include: [
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
              required: false,
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
              ],
            },
          ],
        },
      ],
    });

    // Group products by category
    const productsByCategory = {};
    productsForCategories.forEach(pc => {
      if (pc.Product) {
        const categoryId = pc.categoryId;
        if (!productsByCategory[categoryId]) {
          productsByCategory[categoryId] = [];
        }
        productsByCategory[categoryId].push(pc.Product);
      }
    });

    // Reorder categories based on top selling order
    const orderedCategories = [];
    for (const id of categoryIds) {
      const category = categories.find(c => c.id === parseInt(id));
      if (category) {
        const categoryObj = category.toJSON();
        categoryObj.Products = productsByCategory[id] || [];
        orderedCategories.push(categoryObj);
      }
    }

    /* ---------------- STORE INVENTORY FOR PRODUCTS ---------------- */
    // Get all product variants from these categories to check inventory
    const allProductIds = [];
    orderedCategories.forEach(category => {
      if (category.Products && category.Products.length > 0) {
        category.Products.forEach(product => {
          allProductIds.push(product.id);
        });
      }
    });

    let inventoryMap = {};
    let wishlistedMap = {};

    if (allProductIds.length > 0) {
      // Get all variants for these products
      const allVariants = await ProductVariant.findAll({
        where: { productId: { [Sequelize.Op.in]: allProductIds } },
        attributes: ["id", "productId"],
      });

      const variantIds = allVariants.map(v => v.id);

      if (variantIds.length > 0) {
        const inventory = await StoreInventory.findAll({
          where: { 
            storeId,
            variantId: { [Sequelize.Op.in]: variantIds }
          },
        });

        inventoryMap = {};
        inventory.forEach((inv) => {
          inventoryMap[inv.variantId] = inv.stock;
        });
      }

      /* ---------------- WISHLIST ---------------- */
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
    }

    /* ---------------- FORMAT RESPONSE ---------------- */
    const finalCategories = orderedCategories.map((category) => {
      // Get first product image for category
      let categoryImage = null;
      
      // Format products within category
      if (category.Products && category.Products.length > 0) {
        category.Products = category.Products.map((product) => {
          // Format variants with inventory and wishlist
          if (product.variants && product.variants.length > 0) {
            product.variants = product.variants.map((variant) => {
              const stock = inventoryMap[variant.id] || 0;
              
              // Price calculations
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
          }
          
          return {
            ...product,
            isWishlisted: !!wishlistedMap[product.id],
            wishlistedVariants: wishlistedMap[product.id] || [],
          };
        });
        
        // Get the first product's first variant's first image
        const firstProduct = category.Products[0];
        if (firstProduct && firstProduct.variants && firstProduct.variants.length > 0) {
          const firstVariant = firstProduct.variants[0];
          if (firstVariant.images && firstVariant.images.length > 0) {
            categoryImage = firstVariant.images[0].imageUrl;
          }
        }
      }
      
      return {
        id: category.id,
        name: category.name,
        isActive: category.isActive,
        createdAt: category.createdAt,
        subcategories: category.subcategories || [],
        Products: category.Products || [],
        totalSold: salesDataMap[category.id] || 0,
        categoryImage,
      };
    });

    // Use the same pagination format
    const response = formatPagination(
      { count: totalCount, rows: finalCategories },
      currentPage,
      limit
    );

    return res.json({
      success: true,
      source: "top-selling-categories",
      ...response,
    });

  } catch (error) {
    console.error("GET TOP SELLING CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function for fallback categories
async function getFallbackCategories(req, res, storeId, paginationOptions) {
  try {
    const { limit, currentPage, offset } = paginationOptions;
    
    const totalCount = await Category.count({
      where: { isActive: true },
    });

    const categories = await Category.findAll({
      where: { isActive: true },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: ["id", "name", "isActive", "createdAt"],
      include: [
        {
          model: SubCategory,
          as: "subcategories", // Match your association
          attributes: ["id", "name", "isActive"],
          required: false,
        },
      ],
    });

    // Format categories with placeholder image
    const formattedCategories = categories.map(category => {
      const cat = category.toJSON();
      return {
        ...cat,
        Products: [],
        categoryImage: null,
        totalSold: 0,
      };
    });

    const response = formatPagination(
      { count: totalCount, rows: formattedCategories },
      currentPage,
      limit
    );

    return res.json({
      success: true,
      source: "fallback-categories",
      ...response,
    });
  } catch (error) {
    console.error("FALLBACK CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}