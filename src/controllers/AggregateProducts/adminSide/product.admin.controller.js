const {
  Product,
  ProductVariant,
  ProductPrice,
  ProductSpec,
  VariantImage,
  VariantSize,
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

    /* ---------------- FETCH PRODUCTS ---------------- */
    const products = await Product.findAndCountAll({
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
          model: ProductSpec,
          as: "specs",
          attributes: ["specKey", "specValue"],
        },
        {
          model: ProductVariant,
          as: "variants",
          include: [
            { model: VariantImage, as: "images" },
            { model: VariantSize, as: "sizes" },
            { model: ProductPrice, as: "price" },
          ],
        },
      ],
      distinct: true,
      order: [["createdAt", "DESC"]],
      ...paginationOptions,
    });

    /* ---------------- GET ALL INVENTORY ---------------- */
    const inventory = await StoreInventory.findAll();

    const inventoryMap = {};

    inventory.forEach((inv) => {
      const key = `${inv.variantId}-${inv.variantSizeId}`;

      if (!inventoryMap[key]) {
        inventoryMap[key] = [];
      }

      inventoryMap[key].push({
        storeId: inv.storeId,
        stock: inv.stock,
      });
    });

    /* ---------------- FINAL RESPONSE ---------------- */
    const finalProducts = products.rows.map((p) => {
      const product = p.toJSON();

      product.variants = product.variants.map((variant) => {
        let variantTotalStock = 0;

        const sizes = variant.sizes.map((size) => {
          const key = `${variant.id}-${size.id}`;
          const stockData = inventoryMap[key] || [];

          const totalStock = stockData.reduce(
            (sum, s) => sum + s.stock,
            0
          );

          variantTotalStock += totalStock;

          return {
            ...size,
            totalStock,
            stocks: stockData, // 🔥 per store
          };
        });

        return {
          ...variant,
          sizes,
          totalStock: variantTotalStock,
          stockStatus:
            variantTotalStock > 0 ? "In Stock" : "Out of Stock",
        };
      });

      return product;
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
      include: [
        { model: Category, as: "Category" },
        { model: SubCategory, as: "SubCategory" },
        { model: ProductCategory, as: "ProductCategory" },
        { model: ProductSpec, as: "specs" },
        {
          model: ProductVariant,
          as: "variants",
          include: [
            { model: VariantImage, as: "images" },
            { model: VariantSize, as: "sizes" },
            { model: ProductPrice, as: "price" },
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
    const inventory = await StoreInventory.findAll();

    const inventoryMap = {};

    inventory.forEach((inv) => {
      const key = `${inv.variantId}-${inv.variantSizeId}`;

      if (!inventoryMap[key]) {
        inventoryMap[key] = [];
      }

      inventoryMap[key].push({
        storeId: inv.storeId,
        stock: inv.stock,
      });
    });

    const productData = product.toJSON();

    productData.variants = productData.variants.map((variant) => {
      let variantTotalStock = 0;

      const sizes = variant.sizes.map((size) => {
        const key = `${variant.id}-${size.id}`;
        const stockData = inventoryMap[key] || [];

        const totalStock = stockData.reduce(
          (sum, s) => sum + s.stock,
          0
        );

        variantTotalStock += totalStock;

        return {
          ...size,
          totalStock,
          stocks: stockData,
        };
      });

      return {
        ...variant,
        sizes,
        totalStock: variantTotalStock,
        stockStatus:
          variantTotalStock > 0 ? "In Stock" : "Out of Stock",
      };
    });

    return res.json({
      success: true,
      data: productData,
    });
  } catch (error) {
    console.error("ADMIN GET PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};