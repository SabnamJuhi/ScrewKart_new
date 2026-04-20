




const {
  Product,
  ProductVariant,
  ProductPrice,
  ProductAttribute,
  ProductMeasurement,
  MeasurementMaster,
  VariantImage,
  VariantPricingSlab,
  Category,
  SubCategory,
  ProductCategory,
  StoreInventory,
} = require("../../../models");

const {
  getPaginationOptions,
  formatPagination,
} = require("../../../utils/paginate");

exports.getAllProductsDetailsAdmin = async (req, res) => {
  try {
    const paginationOptions = getPaginationOptions(req.query);

    /* ---------------- FILTER ---------------- */
    const productWhere = {};
    if (req.query.isActive !== undefined) {
      productWhere.isActive = req.query.isActive === "true";
    }

    /* ---------------- FETCH PRODUCTS ---------------- */
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
        "updatedAt",
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
          model: ProductAttribute,
          as: "attributes",
          where: { variantId: null },
          required: false,
          attributes: ["attributeKey", "attributeValue"],
        },
        {
          model: ProductMeasurement,
          as: "measurements",
          where: { variantId: null },
          required: false,
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
            "createdAt",
            "updatedAt",
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
              model: VariantPricingSlab,
              as: "pricingSlabs",
              attributes: ["id", "minQty", "maxQty", "price"],
              order: [["minQty", "ASC"]],
            },
            {
              model: ProductAttribute,
              as: "attributes",
              required: false,
              attributes: ["attributeKey", "attributeValue"],
            },
            {
              model: ProductMeasurement,
              as: "measurements",
              required: false,
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
      ],
      distinct: true,
      order: [["createdAt", "DESC"]],
      ...paginationOptions,
    });

    /* ---------------- GET ALL INVENTORY ---------------- */
    const inventory = await StoreInventory.findAll({
      attributes: ["variantId", "stock", "storeId"],
    });

    const inventoryMap = {};
    inventory.forEach((inv) => {
      const variantId = inv.variantId;
      if (!inventoryMap[variantId]) {
        inventoryMap[variantId] = {
          totalStock: 0,
          stores: [],
        };
      }
      inventoryMap[variantId].totalStock += inv.stock;
      inventoryMap[variantId].stores.push({
        storeId: inv.storeId,
        stock: inv.stock,
      });
    });

    /* ---------------- FINAL RESPONSE ---------------- */
    const finalProducts = products.rows.map((p) => {
      const product = p.toJSON();

      // Format product level attributes
      const productAttributes = {};
      (product.attributes || []).forEach((attr) => {
        productAttributes[attr.attributeKey] = attr.attributeValue;
      });

      // Format product level measurements
      const productMeasurements = {};
      (product.measurements || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        productMeasurements[label] = `${m.value}${unit}`;
      });

      product.variants = product.variants.map((variant) => {
        // Get inventory for this variant
        const variantInventory = inventoryMap[variant.id] || {
          totalStock: 0,
          stores: [],
        };
        
        const totalStock = variantInventory.totalStock;
        
        // Format variant level attributes
        const variantAttributes = {};
        (variant.attributes || []).forEach((attr) => {
          variantAttributes[attr.attributeKey] = attr.attributeValue;
        });

        // Format variant level measurements
        const variantMeasurements = {};
        (variant.measurements || []).forEach((m) => {
          const label = m.measurement?.name || `ID_${m.measurementId}`;
          const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
          variantMeasurements[label] = `${m.value}${unit}`;
        });

        // Format images
        const formattedImages = (variant.images || []).map(img => ({
          id: img.id,
          imageUrl: img.imageUrl,
          isPrimary: img.isPrimary || false,
        })).sort((a, b) => (a.isPrimary === b.isPrimary) ? 0 : a.isPrimary ? -1 : 1);

        // Get primary image
        const primaryImage = formattedImages.find(img => img.isPrimary) || formattedImages[0];
        const imageUrl = primaryImage?.imageUrl || null;

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
          totalStock,
          stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",
          inventory: variantInventory.stores, // Per store inventory
          attributes: variantAttributes,
          measurements: variantMeasurements,
          images: formattedImages,
          imageUrl,
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
        totalVariants: product.variants.length,
        totalStock: product.variants.reduce((sum, v) => sum + (v.totalStock || 0), 0),
        priceRange: product.variants.length > 0 ? {
          min: Math.min(...product.variants.map(v => v.price?.sellingPrice || 0)),
          max: Math.max(...product.variants.map(v => v.price?.sellingPrice || 0)),
        } : null,
      };
    });

    const response = formatPagination(
      { count: products.count, rows: finalProducts },
      paginationOptions.currentPage,
      paginationOptions.limit
    );

    return res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("ADMIN GET PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getProductDetailsByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
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
        "updatedAt",
      ],
      include: [
        { model: Category, as: "Category", attributes: ["id", "name"] },
        { model: SubCategory, as: "SubCategory", attributes: ["id", "name"] },
        { model: ProductCategory, as: "ProductCategory", attributes: ["id", "name"] },
        {
          model: ProductAttribute,
          as: "attributes",
          where: { variantId: null },
          required: false,
          attributes: ["attributeKey", "attributeValue"],
        },
        {
          model: ProductMeasurement,
          as: "measurements",
          where: { variantId: null },
          required: false,
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
            "createdAt",
            "updatedAt",
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
              model: VariantPricingSlab,
              as: "pricingSlabs",
              attributes: ["id", "minQty", "maxQty", "price"],
              order: [["minQty", "ASC"]],
            },
            {
              model: ProductAttribute,
              as: "attributes",
              required: false,
              attributes: ["attributeKey", "attributeValue"],
            },
            {
              model: ProductMeasurement,
              as: "measurements",
              required: false,
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
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /* ---------------- INVENTORY ---------------- */
    const inventory = await StoreInventory.findAll({
      attributes: ["variantId", "stock", "storeId"],
    });

    const inventoryMap = {};
    inventory.forEach((inv) => {
      const variantId = inv.variantId;
      if (!inventoryMap[variantId]) {
        inventoryMap[variantId] = {
          totalStock: 0,
          stores: [],
        };
      }
      inventoryMap[variantId].totalStock += inv.stock;
      inventoryMap[variantId].stores.push({
        storeId: inv.storeId,
        stock: inv.stock,
      });
    });

    const productData = product.toJSON();

    // Format product level attributes
    const productAttributes = {};
    (productData.attributes || []).forEach((attr) => {
      productAttributes[attr.attributeKey] = attr.attributeValue;
    });

    // Format product level measurements
    const productMeasurements = {};
    (productData.measurements || []).forEach((m) => {
      const label = m.measurement?.name || `ID_${m.measurementId}`;
      const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
      productMeasurements[label] = `${m.value}${unit}`;
    });

    productData.variants = productData.variants.map((variant) => {
      // Get inventory for this variant
      const variantInventory = inventoryMap[variant.id] || {
        totalStock: 0,
        stores: [],
      };
      
      const totalStock = variantInventory.totalStock;
      
      // Format variant level attributes
      const variantAttributes = {};
      (variant.attributes || []).forEach((attr) => {
        variantAttributes[attr.attributeKey] = attr.attributeValue;
      });

      // Format variant level measurements
      const variantMeasurements = {};
      (variant.measurements || []).forEach((m) => {
        const label = m.measurement?.name || `ID_${m.measurementId}`;
        const unit = m.measurement?.unit ? ` ${m.measurement.unit}` : "";
        variantMeasurements[label] = `${m.value}${unit}`;
      });

      // Format images
      const formattedImages = (variant.images || []).map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary || false,
      })).sort((a, b) => (a.isPrimary === b.isPrimary) ? 0 : a.isPrimary ? -1 : 1);

      // Get primary image
      const primaryImage = formattedImages.find(img => img.isPrimary) || formattedImages[0];
      const imageUrl = primaryImage?.imageUrl || null;

      // Price calculations
      const mrp = variant.price?.mrp || 0;
      const sellingPrice = variant.price?.sellingPrice || 0;
      const gstRate = parseFloat(productData.gstRate) || 0;

      const gstAmount = (sellingPrice * gstRate) / 100;
      const gstInclusiveAmount = Math.round(sellingPrice + gstAmount);
      const discount = mrp > 0 ? mrp - sellingPrice : 0;
      const discountPercentage = mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

      // Format pack quantity display for admin
      let packQuantityDisplay = null;
      if (variant.packQuantity) {
        packQuantityDisplay = {
          value: variant.packQuantity,
          label: `${variant.packQuantity} ${variant.unit === 'BOX' ? 'items/box' : 'items'}`,
          description: variant.packingType === 'BOX' ? `Pack contains ${variant.packQuantity} units` : null
        };
      }

      return {
        ...variant,
        totalStock,
        stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",
        inventory: variantInventory.stores, // Per store inventory
        attributes: variantAttributes,
        measurements: variantMeasurements,
        images: formattedImages,
        imageUrl,
        packQuantityDisplay,
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

    return res.json({
      success: true,
      data: {
        ...productData,
        attributes: productAttributes,
        measurements: productMeasurements,
        totalVariants: productData.variants.length,
        totalStock: productData.variants.reduce((sum, v) => sum + (v.totalStock || 0), 0),
        priceRange: productData.variants.length > 0 ? {
          min: Math.min(...productData.variants.map(v => v.price?.sellingPrice || 0)),
          max: Math.max(...productData.variants.map(v => v.price?.sellingPrice || 0)),
        } : null,
      },
    });
  } catch (error) {
    console.error("ADMIN GET PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};