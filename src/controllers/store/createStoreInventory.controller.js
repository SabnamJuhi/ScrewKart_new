const sequelize = require("../../config/db");
const StoreInventory = require("../../models/products/StoreInventory.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");

exports.createStoreInventory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { storeId, inventory } = req.body;

    if (!storeId) throw new Error("storeId is required");
    if (!Array.isArray(inventory) || inventory.length === 0) {
      throw new Error("inventory must be a non-empty array");
    }

    // Insert inventory
    const rows = inventory.map((item) => ({
      storeId,
      productId: item.productId,
      variantId: item.variantId,
      variantSizeId: item.variantSizeId,
      stock: item.stock || 0,
      isAvailable: item.stock > 0,
    }));

    await StoreInventory.bulkCreate(rows, { transaction: t });

    // 🔥 Recalculate total stock per variant
    const variantIds = [...new Set(inventory.map(i => i.variantId))];

    for (const variantId of variantIds) {
      const totalStock = await StoreInventory.sum("stock", {
        where: { variantId },
        transaction: t,
      });

      await ProductVariant.update(
        {
          totalStock: totalStock || 0,
          stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",
        },
        {
          where: { id: variantId },
          transaction: t,
        }
      );
    }

    await t.commit();

    res.json({
      success: true,
      message: "Store inventory created successfully",
    });

  } catch (error) {
    await t.rollback();

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};