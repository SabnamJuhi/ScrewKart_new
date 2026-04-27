
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
//         [sequelize.col("Product.categoryId"), "categoryId"],
//         [sequelize.fn("SUM", sequelize.col("OrderItem.quantity")), "totalSold"],
//       ],
//       include: [
//         {
//           model: Order,
//           required: true,
//           where: { storeId },
//           attributes: [],
//         },
//         {
//           model: Product,
//           required: true,
//           attributes: [],
//           where: {
//             isActive: true,
//           },
//         },
//       ],
//       group: ["Product.categoryId"],
//       having: sequelize.where(sequelize.col("Product.categoryId"), "IS NOT", null),
//       order: [[sequelize.literal("totalSold"), "DESC"]],
//       raw: true,
//     });

//     // Get total count of categories with sales
//     const totalCount = topCategoriesData.length;
    
//     // Apply pagination manually
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

//     /* ---------------- FETCH CATEGORIES ---------------- */
//     const categories = await Category.findAll({
//       where: { id: { [Sequelize.Op.in]: categoryIds } },
//       attributes: ["id", "name", "isActive", "createdAt"],
//       include: [
//         {
//           model: SubCategory,
//           as: "subcategories",
//           attributes: ["id", "name", "isActive"],
//           required: false,
//         },
//       ],
//     });

//     // Fetch products for these categories using ProductCategory junction table
//     const productsForCategories = await ProductCategory.findAll({
//       where: { categoryId: { [Sequelize.Op.in]: categoryIds } },
//       include: [
//         {
//           model: Product,
//           required: false,
//           where: { isActive: true },
//           attributes: [
//             "id",
//             "sku",
//             "title",
//             "description",
//             "brandName",
//             "badge",
//             "gstRate",
//             "isActive",
//             "createdAt",
//           ],
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
//     });

//     // Group products by category
//     const productsByCategory = {};
//     productsForCategories.forEach(pc => {
//       if (pc.Product) {
//         const categoryId = pc.categoryId;
//         if (!productsByCategory[categoryId]) {
//           productsByCategory[categoryId] = [];
//         }
//         productsByCategory[categoryId].push(pc.Product);
//       }
//     });

//     // Sort products by createdAt for each category (newest first)
//     for (const categoryId in productsByCategory) {
//       if (productsByCategory[categoryId].length > 0) {
//         productsByCategory[categoryId].sort((a, b) => {
//           return new Date(b.createdAt) - new Date(a.createdAt);
//         });
//       }
//     }

//     // Reorder categories based on top selling order
//     const orderedCategories = [];
//     for (const id of categoryIds) {
//       const category = categories.find(c => c.id === parseInt(id));
//       if (category) {
//         const categoryObj = category.toJSON();
//         categoryObj.Products = productsByCategory[id] || [];
//         orderedCategories.push(categoryObj);
//       }
//     }

//     /* ---------------- STORE INVENTORY FOR PRODUCTS ---------------- */
//     // Get all product variants from these categories to check inventory
//     const allProductIds = [];
//     orderedCategories.forEach(category => {
//       if (category.Products && category.Products.length > 0) {
//         category.Products.forEach(product => {
//           allProductIds.push(product.id);
//         });
//       }
//     });

//     let inventoryMap = {};
//     let wishlistedMap = {};

//     if (allProductIds.length > 0) {
//       // Get all variants for these products
//       const allVariants = await ProductVariant.findAll({
//         where: { productId: { [Sequelize.Op.in]: allProductIds } },
//         attributes: ["id", "productId"],
//       });

//       const variantIds = allVariants.map(v => v.id);

//       if (variantIds.length > 0) {
//         const inventory = await StoreInventory.findAll({
//           where: { 
//             storeId,
//             variantId: { [Sequelize.Op.in]: variantIds }
//           },
//         });

//         inventoryMap = {};
//         inventory.forEach((inv) => {
//           inventoryMap[inv.variantId] = inv.stock;
//         });
//       }

//       /* ---------------- WISHLIST ---------------- */
//       if (userId) {
//         const wishlist = await Wishlist.findAll({
//           where: { userId },
//           attributes: ["productId", "variantId"],
//         });

//         wishlist.forEach((w) => {
//           if (!wishlistedMap[w.productId]) {
//             wishlistedMap[w.productId] = [];
//           }
//           wishlistedMap[w.productId].push(w.variantId);
//         });
//       }
//     }

//     /* ---------------- FORMAT RESPONSE ---------------- */
//     const finalCategories = orderedCategories.map((category) => {
//       let categoryImage = null;
//       let categoryProductCount = 0;
      
//       // Format products within category
//       if (category.Products && category.Products.length > 0) {
//         categoryProductCount = category.Products.length;
        
//         category.Products = category.Products.map((product) => {
//           // Format variants with inventory and wishlist
//           if (product.variants && product.variants.length > 0) {
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
        
//         // Get the first product's first variant's first image (without isPrimary)
//         if (category.Products.length > 0) {
//           const firstProduct = category.Products[0];
//           if (firstProduct && firstProduct.variants && firstProduct.variants.length > 0) {
//             const firstVariant = firstProduct.variants[0];
//             if (firstVariant.images && firstVariant.images.length > 0) {
//               // Simply take the first image
//               categoryImage = firstVariant.images[0].imageUrl;
//             }
//           }
//         }
//       }
      
//       return {
//         id: category.id,
//         name: category.name,
//         isActive: category.isActive,
//         createdAt: category.createdAt,
//         subcategories: category.subcategories || [],
//         Products: category.Products || [],
//         productCount: categoryProductCount,
//         totalSold: salesDataMap[category.id] || 0,
//         categoryImage,
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
//       ],
//     });

//     // Get products for fallback categories to show images
//     const categoryIds = categories.map(cat => cat.id);
//     let productsByCategory = {};
//     let categoryImages = {};

//     if (categoryIds.length > 0) {
//       // Fetch products directly from Product table with categoryId
//       // Since Product has a direct categoryId foreign key
//       const products = await Product.findAll({
//         where: {
//           categoryId: { [Sequelize.Op.in]: categoryIds },
//           isActive: true
//         },
//         attributes: ["id", "title", "createdAt", "categoryId"],
//         include: [
//           {
//             model: ProductVariant,
//             as: "variants",
//             required: false,
//             include: [
//               {
//                 model: VariantImage,
//                 as: "images",
//                 attributes: ["id", "imageUrl"],
//                 limit: 1, // Get only first image
//               },
//             ],
//           },
//         ],
//         order: [["createdAt", "DESC"]],
//       });

//       // Group products by categoryId
//       products.forEach(product => {
//         const categoryId = product.categoryId;
//         if (!productsByCategory[categoryId]) {
//           productsByCategory[categoryId] = [];
//         }
//         productsByCategory[categoryId].push(product);
//       });

//       // Find first image for each category
//       for (const categoryId of categoryIds) {
//         const categoryProducts = productsByCategory[categoryId] || [];
        
//         if (categoryProducts.length > 0) {
//           const firstProduct = categoryProducts[0];
//           if (firstProduct.variants && firstProduct.variants.length > 0) {
//             const firstVariant = firstProduct.variants[0];
//             if (firstVariant.images && firstVariant.images.length > 0) {
//               categoryImages[categoryId] = firstVariant.images[0].imageUrl;
//             }
//           }
//         }
//       }
//     }

//     // Format categories with images
//     const formattedCategories = categories.map(category => {
//       const cat = category.toJSON();
//       const productCount = productsByCategory[category.id]?.length || 0;
//       const categoryImage = categoryImages[category.id] || null;
      
//       return {
//         id: cat.id,
//         name: cat.name,
//         isActive: cat.isActive,
//         createdAt: cat.createdAt,
//         subcategories: cat.subcategories || [],
//         Products: [], // Don't return full products to keep response light
//         productCount: productCount,
//         categoryImage: categoryImage,
//         totalSold: 0,
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
    const MAX_TOTAL_CATEGORIES = 20; // Maximum categories across all pages
     const { limit, currentPage, offset } = getPaginationOptions(req.query);

    /* ---------------- STEP 1: GET ALL TOP CATEGORIES ---------------- */
    const allTopCategoriesData = await Product.findAll({
      attributes: [
        "categoryId",
        [sequelize.fn("SUM", sequelize.col("soldCount")), "totalSold"],
      ],
      where: { isActive: true },
      group: ["categoryId"],
      having: sequelize.where(
        sequelize.fn("SUM", sequelize.col("soldCount")),
        ">",
        0
      ),
      order: [[sequelize.literal("totalSold"), "DESC"]],
      limit: MAX_TOTAL_CATEGORIES, // Only get up to 20 top categories
      raw: true,
    });

    let allCategoryIds = [];
    let salesMap = {};

    // Take all top categories (up to MAX_TOTAL_CATEGORIES)
    allTopCategoriesData.forEach((cat) => {
      allCategoryIds.push(cat.categoryId);
      salesMap[cat.categoryId] = parseInt(cat.totalSold);
    });

    console.log(`Top selling categories found: ${allTopCategoriesData.length}`);

    /* ---------------- STEP 2: FALLBACK TO FILL REMAINING SLOTS ---------------- */
    const remainingSlots = MAX_TOTAL_CATEGORIES - allCategoryIds.length;
    
    if (remainingSlots > 0) {
      console.log(`Need ${remainingSlots} fallback categories to reach ${MAX_TOTAL_CATEGORIES}`);
      
      const fallbackCategories = await Category.findAll({
        where: {
          isActive: true,
          id: { [Sequelize.Op.notIn]: allCategoryIds.length > 0 ? allCategoryIds : [0] },
        },
        order: [["createdAt", "DESC"]],
        limit: remainingSlots,
        raw: true,
      });

      fallbackCategories.forEach((cat) => {
        allCategoryIds.push(cat.id);
        salesMap[cat.id] = 0;
      });
      
      console.log(`Total categories after fallback: ${allCategoryIds.length}`);
    }

    // If no categories found at all
    if (allCategoryIds.length === 0) {
      return res.json({
        success: true,
        source: "top-selling-categories",
        data: [],
        pagination: {
          currentPage,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        meta: {
          topSellingCount: 0,
          fallbackCount: 0,
          maxTotalCategories: MAX_TOTAL_CATEGORIES,
        },
      });
    }

    /* ---------------- STEP 3: APPLY PAGINATION ---------------- */
    const paginatedCategoryIds = allCategoryIds.slice(offset, offset + limit);
    const totalCount = allCategoryIds.length; // This will be at most 20

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    console.log(`Pagination: Page ${currentPage}, Limit ${limit}, Total ${totalCount}, Categories in this page: ${paginatedCategoryIds.length}`);

    /* ---------------- STEP 4: FETCH CATEGORY DETAILS FOR CURRENT PAGE ---------------- */
    const categories = await Category.findAll({
      where: { id: paginatedCategoryIds },
      attributes: ["id", "name", "isActive", "createdAt"],
      include: [
        {
          model: SubCategory,
          as: "subcategories",
          attributes: ["id", "name", "isActive"],
        },
      ],
    });

    /* ---------------- STEP 5: GET ONE IMAGE PER CATEGORY ---------------- */
    const categoryImageMap = {};

    for (const catId of paginatedCategoryIds) {
      const product = await Product.findOne({
        where: {
          categoryId: catId,
          isActive: true,
        },
        include: [
          {
            model: ProductVariant,
            as: "variants",
            attributes: ["id"],
            include: [
              {
                model: VariantImage,
                as: "images",
                attributes: ["imageUrl"],
                limit: 1,
              },
            ],
          },
        ],
        attributes: ["id"],
      });

      if (
        product &&
        product.variants?.length &&
        product.variants[0].images?.length
      ) {
        categoryImageMap[catId] = product.variants[0].images[0].imageUrl;
      } else {
        categoryImageMap[catId] = null;
      }
    }

    /* ---------------- STEP 6: FORMAT CATEGORIES IN CORRECT ORDER ---------------- */
    const orderedCategories = paginatedCategoryIds.map((id) =>
      categories.find((c) => c.id === id)
    ).filter(c => c);

    const finalCategories = orderedCategories.map((category, index) => {
      const globalIndex = allCategoryIds.findIndex(id => id === category.id);
      
      return {
        id: category.id,
        name: category.name,
        isActive: category.isActive,
        createdAt: category.createdAt,
        subcategories: category.subcategories || [],
        totalSold: salesMap[category.id] || 0,
        categoryImage: categoryImageMap[category.id] || null,
        isFallback: salesMap[category.id] === 0,
        globalRank: globalIndex + 1, // Global rank in the 20-category list
      };
    });

    /* ---------------- RESPONSE WITH DYNAMIC PAGINATION ---------------- */
    const response = {
      success: true,
      source: "top-selling-categories",
      data: finalCategories,
      pagination: {
        currentPage,
        limit,
        totalCount, // Total count is at most 20
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      meta: {
        topSellingCount: allTopCategoriesData.length,
        fallbackCount: allCategoryIds.filter(id => salesMap[id] === 0).length,
        maxTotalCategories: MAX_TOTAL_CATEGORIES,
        categoriesInFullList: allCategoryIds.length,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error("TOP SELLING CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};