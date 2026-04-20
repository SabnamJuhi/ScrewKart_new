

// const {
//   Product,
//   ProductVariant,
//   VariantImage,
//   ProductAttribute,
//   ProductMeasurement,
//   MeasurementMaster,
//   ProductPrice,
//   Wishlist,
//   Category,
//   SubCategory,
//   ProductCategory
// } = require("../../models");

// const { Op, Sequelize } = require("sequelize");

// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

// exports.getFilteredProducts = async (req, res) => {
//   try {
//     const query = req.query;
//     const userId = req.user?.id;

//     const { limit, offset, currentPage } = getPaginationOptions(req.query);

//     // =========================
//     // 🔹 1. BUILD WHERE CLAUSES
//     // =========================
//     const productWhere = { isActive: true };
//     const variantWhere = { isActive: true };

//     // Product filters
//     if (query.categoryId) productWhere.categoryId = query.categoryId;
//     if (query.subCategoryId) productWhere.subCategoryId = query.subCategoryId;
//     if (query.productCategoryId) productWhere.productCategoryId = query.productCategoryId;
    
//     if (query.brandName) {
//       productWhere.brandName = { [Op.like]: `%${query.brandName}%` };
//     }

//     if (query.search) {
//       productWhere[Op.or] = [
//         { title: { [Op.like]: `%${query.search}%` } },
//         { sku: { [Op.like]: `%${query.search}%` } },
//         { brandName: { [Op.like]: `%${query.search}%` } },
//       ];
//     }

//     // Variant filters
//     if (query.packQuantity) variantWhere.packQuantity = query.packQuantity;
//     if (query.unit) variantWhere.unit = query.unit;
//     if (query.moq) variantWhere.moq = { [Op.gte]: parseInt(query.moq) };
//     if (query.variantCode) variantWhere.variantCode = { [Op.like]: `%${query.variantCode}%` };
    
//     // Stock status filter
//     if (query.stockStatus === "In Stock") {
//       variantWhere.totalStock = { [Op.gt]: 0 };
//     } else if (query.stockStatus === "Out of Stock") {
//       variantWhere.totalStock = 0;
//     }

//     // =========================
//     // 🔹 2. HANDLE PRICE FILTER SEPARATELY (FIXED)
//     // =========================
//     let priceFilteredVariantIds = null;
    
//     if (query.minPrice || query.maxPrice) {
//       const priceWhere = {};
//       if (query.minPrice && query.maxPrice) {
//         priceWhere.sellingPrice = { [Op.between]: [parseFloat(query.minPrice), parseFloat(query.maxPrice)] };
//       } else if (query.minPrice) {
//         priceWhere.sellingPrice = { [Op.gte]: parseFloat(query.minPrice) };
//       } else if (query.maxPrice) {
//         priceWhere.sellingPrice = { [Op.lte]: parseFloat(query.maxPrice) };
//       }
      
//       // Get variant IDs that match the price filter
//       const priceMatchedVariants = await ProductPrice.findAll({
//         where: priceWhere,
//         attributes: ['variantId'],
//         raw: true,
//       });
      
//       priceFilteredVariantIds = priceMatchedVariants.map(p => p.variantId);
      
//       if (priceFilteredVariantIds.length === 0) {
//         return res.json({
//           success: true,
//           data: [],
//           pagination: { 
//             totalItems: 0, 
//             totalPages: 0, 
//             currentPage, 
//             pageSize: limit, 
//             hasNextPage: false, 
//             hasPreviousPage: false 
//           }
//         });
//       }
      
//       // Apply to variant filter
//       variantWhere.id = { [Op.in]: priceFilteredVariantIds };
//     }

//     // =========================
//     // 🔹 3. GET PRODUCT IDs FROM VARIANTS
//     // =========================
//     const matchedVariants = await ProductVariant.findAll({
//       where: variantWhere,
//       attributes: ['productId', 'id'],
//       raw: true,
//     });

//     if (matchedVariants.length === 0) {
//       return res.json({
//         success: true,
//         data: [],
//         pagination: { 
//           totalItems: 0, 
//           totalPages: 0, 
//           currentPage, 
//           pageSize: limit, 
//           hasNextPage: false, 
//           hasPreviousPage: false 
//         }
//       });
//     }

//     const matchedVariantIds = matchedVariants.map(v => v.id);
//     const filteredProductIds = [...new Set(matchedVariants.map(v => v.productId))];
//     productWhere.id = { [Op.in]: filteredProductIds };

//     // =========================
//     // 🔹 4. ATTRIBUTE FILTER (if provided)
//     // =========================
//     if (query.attributeKey && query.attributeValue) {
//       const attributeMatchedProducts = await ProductAttribute.findAll({
//         where: {
//           attributeKey: query.attributeKey,
//           attributeValue: query.attributeValue,
//         },
//         attributes: ['productId', 'variantId'],
//         raw: true,
//       });
      
//       // Get product IDs from both product-level and variant-level attributes
//       const attributeProductIds = new Set();
//       attributeMatchedProducts.forEach(a => {
//         if (a.productId) attributeProductIds.add(a.productId);
//       });
      
//       if (attributeProductIds.size === 0) {
//         return res.json({
//           success: true,
//           data: [],
//           pagination: { 
//             totalItems: 0, 
//             totalPages: 0, 
//             currentPage, 
//             pageSize: limit, 
//             hasNextPage: false, 
//             hasPreviousPage: false 
//           }
//         });
//       }
      
//       // Intersection with existing product IDs
//       const finalProductIds = filteredProductIds.filter(id => attributeProductIds.has(id));
      
//       if (finalProductIds.length === 0) {
//         return res.json({
//           success: true,
//           data: [],
//           pagination: { 
//             totalItems: 0, 
//             totalPages: 0, 
//             currentPage, 
//             pageSize: limit, 
//             hasNextPage: false, 
//             hasPreviousPage: false 
//           }
//         });
//       }
      
//       productWhere.id = { [Op.in]: finalProductIds };
//     }

//     // =========================
//     // 🔹 5. MEASUREMENT FILTER (if provided)
//     // =========================
//     if (query.measurementName && query.measurementValue) {
//       const measurementMatched = await ProductMeasurement.findAll({
//         where: { value: query.measurementValue },
//         include: [{
//           model: MeasurementMaster,
//           as: 'measurement',
//           where: { name: query.measurementName },
//           attributes: [],
//         }],
//         attributes: ['productId', 'variantId'],
//         raw: true,
//       });
      
//       const measurementProductIds = new Set();
//       measurementMatched.forEach(m => {
//         if (m.productId) measurementProductIds.add(m.productId);
//       });
      
//       if (measurementProductIds.size === 0) {
//         return res.json({
//           success: true,
//           data: [],
//           pagination: { 
//             totalItems: 0, 
//             totalPages: 0, 
//             currentPage, 
//             pageSize: limit, 
//             hasNextPage: false, 
//             hasPreviousPage: false 
//           }
//         });
//       }
      
//       // Intersection with existing product IDs
//       const currentIds = productWhere.id[Op.in];
//       const finalProductIds = currentIds.filter(id => measurementProductIds.has(id));
      
//       if (finalProductIds.length === 0) {
//         return res.json({
//           success: true,
//           data: [],
//           pagination: { 
//             totalItems: 0, 
//             totalPages: 0, 
//             currentPage, 
//             pageSize: limit, 
//             hasNextPage: false, 
//             hasPreviousPage: false 
//           }
//         });
//       }
      
//       productWhere.id = { [Op.in]: finalProductIds };
//     }

//     // =========================
//     // 🔹 6. MAIN PRODUCT QUERY (SIMPLIFIED - NO PRICE JOIN)
//     // =========================
//     const products = await Product.findAndCountAll({
//       where: productWhere,
//       attributes: ['id', 'sku', 'title', 'description', 'brandName', 'badge', 'gstRate', 'isActive', 'createdAt'],
//       include: [
//         { model: Category, as: 'Category', attributes: ['id', 'name'] },
//         { model: SubCategory, as: 'SubCategory', attributes: ['id', 'name'] },
//         { model: ProductCategory, as: 'ProductCategory', attributes: ['id', 'name'] },
//         {
//           model: ProductVariant,
//           as: 'variants',
//           where: { id: { [Op.in]: matchedVariantIds } },
//           required: true,
//           include: [
//             { model: VariantImage, as: 'images', attributes: ['id', 'imageUrl'] },
//             { 
//               model: ProductPrice, 
//               as: 'price', 
//               attributes: ['id', 'mrp', 'sellingPrice', 'discountPercentage', 'currency']
//             },
//             { model: ProductAttribute, as: 'attributes', attributes: ['attributeKey', 'attributeValue'] },
//             {
//               model: ProductMeasurement,
//               as: 'measurements',
//               attributes: ['measurementId', 'value'],
//               include: [{ model: MeasurementMaster, as: 'measurement', attributes: ['id', 'name', 'unit'] }]
//             }
//           ]
//         },
//         { model: ProductAttribute, as: 'attributes', attributes: ['attributeKey', 'attributeValue'] },
//         {
//           model: ProductMeasurement,
//           as: 'measurements',
//           attributes: ['measurementId', 'value'],
//           include: [{ model: MeasurementMaster, as: 'measurement', attributes: ['id', 'name', 'unit'] }]
//         }
//       ],
//       order: [['createdAt', 'DESC']],
//       limit,
//       offset,
//       distinct: true
//     });

//     // =========================
//     // 🔹 7. WISHLIST
//     // =========================
//     let wishlistedMap = {};
//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId },
//         attributes: ['productId', 'variantId'],
//       });
//       wishlist.forEach((w) => {
//         if (!wishlistedMap[w.productId]) wishlistedMap[w.productId] = [];
//         wishlistedMap[w.productId].push(w.variantId);
//       });
//     }

//     // =========================
//     // 🔹 8. FORMAT FUNCTIONS
//     // =========================
//     const formatAttributes = (arr) => {
//       const obj = {};
//       (arr || []).forEach((item) => { 
//         obj[item.attributeKey] = item.attributeValue; 
//       });
//       return obj;
//     };

//     const formatMeasurements = (arr) => {
//       const obj = {};
//       (arr || []).forEach((m) => {
//         const label = m.measurement?.name || `ID_${m.measurementId}`;
//         const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : '';
//         obj[label] = `${m.value}${unit}`;
//       });
//       return obj;
//     };

//     // =========================
//     // 🔹 9. FORMAT FINAL DATA
//     // =========================
//     const finalProducts = products.rows.map((p) => {
//       const product = p.toJSON();
//       const productAttributes = formatAttributes(product.attributes);
//       const productMeasurements = formatMeasurements(product.measurements);

//       const formattedVariants = (product.variants || []).map((variant) => {
//         const variantAttributes = formatAttributes(variant.attributes);
//         const variantMeasurements = formatMeasurements(variant.measurements);

//         const mrp = variant.price?.mrp || 0;
//         const sellingPrice = variant.price?.sellingPrice || 0;
//         const gstRate = parseFloat(product.gstRate) || 0;
//         const gstAmount = (sellingPrice * gstRate) / 100;
//         const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);
//         const discount = mrp > 0 ? mrp - sellingPrice : 0;
//         const discountPercentage = mrp > 0 ? Math.round((discount / mrp) * 100) : 0;
//         const stock = variant.totalStock || 0;

//         return {
//           ...variant,
//           stock,
//           isAvailable: stock > 0,
//           totalStock: stock,
//           stockStatus: stock > 0 ? 'In Stock' : 'Out of Stock',
//           attributes: variantAttributes,
//           measurements: variantMeasurements,
//           price: {
//             ...(variant.price || {}),
//             mrp, 
//             sellingPrice, 
//             gstRate,
//             gstAmount: Math.round(gstAmount),
//             gstInclusiveAmount, 
//             discount, 
//             discountPercentage
//           },
//           isWishlisted: (wishlistedMap[product.id] || []).includes(variant.id),
//         };
//       });

//       return {
//         ...product,
//         variants: formattedVariants,
//         attributes: productAttributes,
//         measurements: productMeasurements,
//         isWishlisted: !!wishlistedMap[product.id],
//         wishlistedVariants: wishlistedMap[product.id] || [],
//       };
//     });

//     // =========================
//     // 🔹 10. PAGINATION RESPONSE
//     // =========================
//     const response = formatPagination(
//       { count: products.count, rows: finalProducts },
//       currentPage,
//       limit
//     );

//     return res.json({ success: true, ...response });
//   } catch (err) {
//     console.error('GET FILTERED PRODUCTS ERROR:', err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };




const {
  Product,
  ProductVariant,
  VariantImage,
  ProductAttribute,
  ProductMeasurement,
  MeasurementMaster,
  ProductPrice,
  VariantPricingSlab,
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
    // 🔹 1. BUILD WHERE CLAUSES
    // =========================
    const productWhere = { isActive: true };
    const variantWhere = { isActive: true };

    // Product filters
    if (query.categoryId) productWhere.categoryId = query.categoryId;
    if (query.subCategoryId) productWhere.subCategoryId = query.subCategoryId;
    if (query.productCategoryId) productWhere.productCategoryId = query.productCategoryId;
    
    if (query.brandName) {
      productWhere.brandName = { [Op.like]: `%${query.brandName}%` };
    }

    if (query.search) {
      productWhere[Op.or] = [
        { title: { [Op.like]: `%${query.search}%` } },
        { sku: { [Op.like]: `%${query.search}%` } },
        { brandName: { [Op.like]: `%${query.search}%` } },
      ];
    }

    // Variant filters
    if (query.packQuantity) variantWhere.packQuantity = query.packQuantity;
    if (query.unit) variantWhere.unit = query.unit;
    if (query.moq) variantWhere.moq = { [Op.gte]: parseInt(query.moq) };
    if (query.variantCode) variantWhere.variantCode = { [Op.like]: `%${query.variantCode}%` };
    
    // Stock status filter
    if (query.stockStatus === "In Stock") {
      variantWhere.totalStock = { [Op.gt]: 0 };
    } else if (query.stockStatus === "Out of Stock") {
      variantWhere.totalStock = 0;
    }

    // =========================
    // 🔹 2. HANDLE PRICE FILTER (REGULAR PRICE & PRICING SLAB)
    // =========================
    let priceFilteredVariantIds = null;
    
    // Check if pricing slab filter is requested
    const hasPricingSlabFilter = query.minQty && query.maxQty;
    
    if (query.minPrice || query.maxPrice || hasPricingSlabFilter) {
      
      if (hasPricingSlabFilter) {
        // Handle pricing slab filter
        const minQty = parseInt(query.minQty);
        const maxQty = parseInt(query.maxQty);
        
        // Find variants that have pricing slabs within the requested quantity range
        const pricingSlabVariants = await VariantPricingSlab.findAll({
          where: {
            [Op.and]: [
              { minQty: { [Op.lte]: maxQty } },
              { maxQty: { [Op.gte]: minQty } }
            ]
          },
          attributes: ['variantId'],
          group: ['variantId'],
          raw: true,
        });
        
        if (pricingSlabVariants.length === 0) {
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
        
        priceFilteredVariantIds = pricingSlabVariants.map(p => p.variantId);
        
      } else {
        // Handle regular price filter
        const priceWhere = {};
        if (query.minPrice && query.maxPrice) {
          priceWhere.sellingPrice = { [Op.between]: [parseFloat(query.minPrice), parseFloat(query.maxPrice)] };
        } else if (query.minPrice) {
          priceWhere.sellingPrice = { [Op.gte]: parseFloat(query.minPrice) };
        } else if (query.maxPrice) {
          priceWhere.sellingPrice = { [Op.lte]: parseFloat(query.maxPrice) };
        }
        
        // Get variant IDs that match the price filter
        const priceMatchedVariants = await ProductPrice.findAll({
          where: priceWhere,
          attributes: ['variantId'],
          raw: true,
        });
        
        priceFilteredVariantIds = priceMatchedVariants.map(p => p.variantId);
      }
      
      if (priceFilteredVariantIds.length === 0) {
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
      
      // Apply to variant filter
      variantWhere.id = { [Op.in]: priceFilteredVariantIds };
    }

    // =========================
    // 🔹 3. GET PRODUCT IDs FROM VARIANTS
    // =========================
    const matchedVariants = await ProductVariant.findAll({
      where: variantWhere,
      attributes: ['productId', 'id'],
      raw: true,
    });

    if (matchedVariants.length === 0) {
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

    const matchedVariantIds = matchedVariants.map(v => v.id);
    const filteredProductIds = [...new Set(matchedVariants.map(v => v.productId))];
    productWhere.id = { [Op.in]: filteredProductIds };

    // =========================
    // 🔹 4. ATTRIBUTE FILTER (if provided)
    // =========================
    if (query.attributeKey && query.attributeValue) {
      const attributeMatchedProducts = await ProductAttribute.findAll({
        where: {
          attributeKey: query.attributeKey,
          attributeValue: query.attributeValue,
        },
        attributes: ['productId', 'variantId'],
        raw: true,
      });
      
      // Get product IDs from both product-level and variant-level attributes
      const attributeProductIds = new Set();
      attributeMatchedProducts.forEach(a => {
        if (a.productId) attributeProductIds.add(a.productId);
      });
      
      if (attributeProductIds.size === 0) {
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
      
      // Intersection with existing product IDs
      const finalProductIds = filteredProductIds.filter(id => attributeProductIds.has(id));
      
      if (finalProductIds.length === 0) {
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
      
      productWhere.id = { [Op.in]: finalProductIds };
    }

    // =========================
    // 🔹 5. MEASUREMENT FILTER (if provided)
    // =========================
    if (query.measurementName && query.measurementValue) {
      const measurementMatched = await ProductMeasurement.findAll({
        where: { value: query.measurementValue },
        include: [{
          model: MeasurementMaster,
          as: 'measurement',
          where: { name: query.measurementName },
          attributes: [],
        }],
        attributes: ['productId', 'variantId'],
        raw: true,
      });
      
      const measurementProductIds = new Set();
      measurementMatched.forEach(m => {
        if (m.productId) measurementProductIds.add(m.productId);
      });
      
      if (measurementProductIds.size === 0) {
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
      
      // Intersection with existing product IDs
      const currentIds = productWhere.id[Op.in];
      const finalProductIds = currentIds.filter(id => measurementProductIds.has(id));
      
      if (finalProductIds.length === 0) {
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
      
      productWhere.id = { [Op.in]: finalProductIds };
    }

    // =========================
    // 🔹 6. MAIN PRODUCT QUERY (WITH PRICING SLABS)
    // =========================
    const products = await Product.findAndCountAll({
      where: productWhere,
      attributes: ['id', 'sku', 'title', 'description', 'brandName', 'badge', 'gstRate', 'isActive', 'createdAt'],
      include: [
        { model: Category, as: 'Category', attributes: ['id', 'name'] },
        { model: SubCategory, as: 'SubCategory', attributes: ['id', 'name'] },
        { model: ProductCategory, as: 'ProductCategory', attributes: ['id', 'name'] },
        {
          model: ProductVariant,
          as: 'variants',
          where: { id: { [Op.in]: matchedVariantIds } },
          required: true,
          include: [
            { model: VariantImage, as: 'images', attributes: ['id', 'imageUrl'] },
            { 
              model: ProductPrice, 
              as: 'price', 
              attributes: ['id', 'mrp', 'sellingPrice', 'discountPercentage', 'currency']
            },
            {
              model: VariantPricingSlab,
              as: 'pricingSlabs',
              attributes: ['id', 'minQty', 'maxQty', 'price'],
              order: [['minQty', 'ASC']],
            },
            { model: ProductAttribute, as: 'attributes', attributes: ['attributeKey', 'attributeValue'] },
            {
              model: ProductMeasurement,
              as: 'measurements',
              attributes: ['measurementId', 'value'],
              include: [{ model: MeasurementMaster, as: 'measurement', attributes: ['id', 'name', 'unit'] }]
            }
          ]
        },
        { model: ProductAttribute, as: 'attributes', attributes: ['attributeKey', 'attributeValue'] },
        {
          model: ProductMeasurement,
          as: 'measurements',
          attributes: ['measurementId', 'value'],
          include: [{ model: MeasurementMaster, as: 'measurement', attributes: ['id', 'name', 'unit'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    // =========================
    // 🔹 7. WISHLIST
    // =========================
    let wishlistedMap = {};
    if (userId) {
      const wishlist = await Wishlist.findAll({
        where: { userId },
        attributes: ['productId', 'variantId'],
      });
      wishlist.forEach((w) => {
        if (!wishlistedMap[w.productId]) wishlistedMap[w.productId] = [];
        wishlistedMap[w.productId].push(w.variantId);
      });
    }

    // =========================
    // 🔹 8. FORMAT FUNCTIONS
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
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : '';
        obj[label] = `${m.value}${unit}`;
      });
      return obj;
    };

    const getPriceForQuantity = (pricingSlabs, quantity, regularPrice) => {
      if (!pricingSlabs || pricingSlabs.length === 0) {
        return regularPrice;
      }
      
      // Find applicable pricing slab
      const applicableSlab = pricingSlabs.find(slab => 
        quantity >= slab.minQty && (slab.maxQty === null || quantity <= slab.maxQty)
      );
      
      return applicableSlab ? applicableSlab.price : regularPrice;
    };

    // =========================
    // 🔹 9. FORMAT FINAL DATA
    // =========================
    const finalProducts = products.rows.map((p) => {
      const product = p.toJSON();
      const productAttributes = formatAttributes(product.attributes);
      const productMeasurements = formatMeasurements(product.measurements);

      const formattedVariants = (product.variants || []).map((variant) => {
        const variantAttributes = formatAttributes(variant.attributes);
        const variantMeasurements = formatMeasurements(variant.measurements);

        const mrp = variant.price?.mrp || 0;
        const sellingPrice = variant.price?.sellingPrice || 0;
        const gstRate = parseFloat(product.gstRate) || 0;
        const gstAmount = (sellingPrice * gstRate) / 100;
        const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);
        const discount = mrp > 0 ? mrp - sellingPrice : 0;
        const discountPercentage = mrp > 0 ? Math.round((discount / mrp) * 100) : 0;
        const stock = variant.totalStock || 0;

        // Format pricing slabs
        const formattedPricingSlabs = (variant.pricingSlabs || []).map(slab => ({
          minQty: slab.minQty,
          maxQty: slab.maxQty,
          price: slab.price,
          discountPercentage: mrp > 0 ? Math.round(((mrp - slab.price) / mrp) * 100) : 0
        }));

        return {
          ...variant,
          stock,
          isAvailable: stock > 0,
          totalStock: stock,
          stockStatus: stock > 0 ? 'In Stock' : 'Out of Stock',
          attributes: variantAttributes,
          measurements: variantMeasurements,
          pricingSlabs: formattedPricingSlabs,
          getPriceForQuantity: (quantity) => getPriceForQuantity(variant.pricingSlabs, quantity, sellingPrice),
          price: {
            ...(variant.price || {}),
            mrp, 
            sellingPrice, 
            gstRate,
            gstAmount: Math.round(gstAmount),
            gstInclusiveAmount, 
            discount, 
            discountPercentage
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
        hasPricingSlabs: formattedVariants.some(v => v.pricingSlabs && v.pricingSlabs.length > 0)
      };
    });

    // =========================
    // 🔹 10. PAGINATION RESPONSE
    // =========================
    const response = formatPagination(
      { count: products.count, rows: finalProducts },
      currentPage,
      limit
    );

    return res.json({ success: true, ...response });
  } catch (err) {
    console.error('GET FILTERED PRODUCTS ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};