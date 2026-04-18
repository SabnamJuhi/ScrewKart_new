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
  Order,
  ProductRating,
  Wishlist
} = require("../../models");
const { Sequelize } = require("sequelize");
const sequelize = require("../../config/db");

exports.getRelatedProductsAdvanced = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { storeId } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "storeId is required",
      });
    }

    // Get original product details
    const originalProduct = await Product.findByPk(id, {
      attributes: ["id", "categoryId", "subCategoryId", "productCategoryId", "brandName"],
    });

    if (!originalProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log('Original Product:', {
      id: originalProduct.id,
      categoryId: originalProduct.categoryId,
      subCategoryId: originalProduct.subCategoryId,
      brandName: originalProduct.brandName
    });

    // Build related products query based on categories
    const whereCondition = {
      id: { [Sequelize.Op.ne]: parseInt(id) },
      isActive: true,
    };

    // Add matching conditions based on product attributes
    const orConditions = [];
    
    // Same category (highest priority)
    if (originalProduct.categoryId) {
      orConditions.push({ categoryId: originalProduct.categoryId });
    }
    
    // Same subcategory
    if (originalProduct.subCategoryId) {
      orConditions.push({ subCategoryId: originalProduct.subCategoryId });
    }
    
    // Same brand
    if (originalProduct.brandName && originalProduct.brandName !== 'Generic') {
      orConditions.push({ brandName: originalProduct.brandName });
    }
    
    if (orConditions.length > 0) {
      whereCondition[Sequelize.Op.or] = orConditions;
    } else {
      // If no conditions, just get any active products
      whereCondition.id = { [Sequelize.Op.ne]: parseInt(id) };
    }

    console.log('Where condition:', JSON.stringify(whereCondition, null, 2));

    // Fetch related products
    let relatedProducts = await Product.findAll({
      where: whereCondition,
      limit: limit,
      order: [
        // Order by relevance: same category + subcategory first, then same category, then same brand
        [Sequelize.literal(`
          CASE 
            WHEN categoryId = ${originalProduct.categoryId || 'NULL'} 
              AND subCategoryId = ${originalProduct.subCategoryId || 'NULL'} 
            THEN 1
            WHEN categoryId = ${originalProduct.categoryId || 'NULL'} THEN 2
            WHEN brandName = '${originalProduct.brandName || ''}' THEN 3
            ELSE 4
          END
        `), "ASC"],
        ["createdAt", "DESC"],
      ],
      attributes: [
        "id", "sku", "title", "description", "brandName",
        "badge", "gstRate", "isActive", "createdAt",
      ],
      include: [
        { model: Category, as: "Category", attributes: ["id", "name"] },
        { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
        { model: ProductCategory, as: "ProductCategory", attributes: ["id", "name"] },
        { model: ProductRating, as: "rating", attributes: ["averageRating", "totalReviews"] },
        {
          model: ProductVariant,
          as: "variants",
          required: true, // Only get products with variants
          attributes: [
            "id", "variantCode", "unit", "moq", "packingType", "packQuantity", 
            "dispatchType", "deliverySla", "isActive", "totalStock", "stockStatus"
          ],
          include: [
            { 
              model: VariantImage, 
              as: "images", 
              attributes: ["id", "imageUrl"],
              limit: 1
            },
            {
              model: ProductPrice,
              as: "price",
              attributes: ["id", "mrp", "sellingPrice", "discountPercentage", "currency"],
            },
            {
              model: ProductAttribute,
              as: "attributes",
              attributes: ["attributeKey", "attributeValue"],
              required: false,
              limit: 5,
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
              limit: 5,
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
          required: false,
        },
        {
          model: OfferApplicableProduct,
          as: "offerApplicableProducts",
          attributes: ["id", "offerId", "subOfferId"],
          required: false,
          include: [
            {
              model: Offer,
              as: "offerDetails",
              attributes: [
                "id", "offerCode", "title", "festival", "description",
                "startDate", "endDate", "isActive",
              ],
              include: [
                {
                  model: OfferSub,
                  as: "subOffers",
                  attributes: [
                    "id", "discountType", "discountValue", 
                    "maxDiscount", "minOrderValue",
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    console.log(`Found ${relatedProducts.length} related products`);

    // If no products found with variants, try without variant requirement
    if (relatedProducts.length === 0) {
      console.log('No products with variants found, trying without variant requirement...');
      
      relatedProducts = await Product.findAll({
        where: whereCondition,
        limit: limit,
        order: [
          [Sequelize.literal(`
            CASE 
              WHEN categoryId = ${originalProduct.categoryId || 'NULL'} 
                AND subCategoryId = ${originalProduct.subCategoryId || 'NULL'} 
              THEN 1
              WHEN categoryId = ${originalProduct.categoryId || 'NULL'} THEN 2
              WHEN brandName = '${originalProduct.brandName || ''}' THEN 3
              ELSE 4
            END
          `), "ASC"],
          ["createdAt", "DESC"],
        ],
        attributes: [
          "id", "sku", "title", "description", "brandName",
          "badge", "gstRate", "isActive", "createdAt",
        ],
        include: [
          { model: Category, as: "Category", attributes: ["id", "name"] },
          { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
          { model: ProductCategory, as: "ProductCategory", attributes: ["id", "name"] },
          { model: ProductRating, as: "rating", attributes: ["averageRating", "totalReviews"] },
          {
            model: ProductVariant,
            as: "variants",
            attributes: [
              "id", "variantCode", "unit", "moq", "packingType", "packQuantity", 
              "dispatchType", "deliverySla", "isActive", "totalStock", "stockStatus"
            ],
            include: [
              { model: VariantImage, as: "images", attributes: ["id", "imageUrl"], limit: 1 },
              {
                model: ProductPrice,
                as: "price",
                attributes: ["id", "mrp", "sellingPrice", "discountPercentage", "currency"],
              },
            ],
          },
        ],
      });
      
      console.log(`Found ${relatedProducts.length} products without variant requirement`);
    }

    /* ---------------- STORE INVENTORY ---------------- */
    const allVariants = [];
    relatedProducts.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          allVariants.push(variant);
        });
      }
    });

    const variantIds = allVariants.map(v => v.id);
    
    console.log('Variant IDs for inventory check:', variantIds);

    const inventory = await StoreInventory.findAll({
      where: {
        storeId,
        variantId: { [Sequelize.Op.in]: variantIds }
      },
    });

    const inventoryMap = {};
    inventory.forEach((inv) => {
      inventoryMap[inv.variantId] = inv.stock;
    });
    
    console.log('Inventory found for', Object.keys(inventoryMap).length, 'variants');

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
    const formattedProducts = [];

    for (const productRecord of relatedProducts) {
      const product = productRecord.toJSON();
      
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
      
      // Check if product has any variant with stock
      let hasStock = false;
      
      const formattedVariants = (product.variants || []).map((variant) => {
        const stock = inventoryMap[variant.id] || 0;
        if (stock > 0) hasStock = true;
        
        // Format Variant Attributes
        const variantAttributes = {};
        (variant.attributes || []).forEach((attr) => {
          variantAttributes[attr.attributeKey] = attr.attributeValue;
        });
        
        // Format Variant Measurements
        const variantMeasurements = {};
        (variant.measurements || []).forEach((m) => {
          const label = m.measurement?.name || `ID_${m.measurementId}`;
          const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
          variantMeasurements[label] = `${m.value}${unit}`;
        });
        
        // Price Calculations
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
      
      // Include product even if no stock (but prioritize those with stock)
      if (formattedProducts.length < limit) {
        formattedProducts.push({
          ...product,
          attributes: productAttributes,
          measurements: productMeasurements,
          variants: formattedVariants,
          isWishlisted: !!wishlistedMap[product.id],
          wishlistedVariants: wishlistedMap[product.id] || [],
          averageRating: product.rating?.averageRating || 0,
          totalReviews: product.rating?.totalReviews || 0,
          hasStock, // Add this flag to help frontend
        });
      }
    }

    console.log(`Returning ${formattedProducts.length} formatted products`);

    return res.json({
      success: true,
      data: formattedProducts,
      meta: {
        total: formattedProducts.length,
        limit,
        productId: id,
      },
    });

  } catch (error) {
    console.error("GET RELATED PRODUCTS ADVANCED ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};