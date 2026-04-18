



const sequelize = require("../../config/db");
const StoreInventory = require("../../models/products/storeInventory.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");


/* ================= CREATE / BULK UPSERT INVENTORY ================= */
exports.createStoreInventory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { storeId, inventory } = req.body;

    if (!storeId) throw new Error("storeId is required");
    if (!Array.isArray(inventory) || inventory.length === 0) {
      throw new Error("inventory must be a non-empty array");
    }

    for (const item of inventory) {
      if (!item.variantId) throw new Error("variantId is required");

      const finalStock = Number(item.stock) || 0;

      const [record, created] = await StoreInventory.findOrCreate({
        where: {
          storeId,
          variantId: item.variantId,
        },
        defaults: {
          storeId,
          productId: item.productId || null,
          variantId: item.variantId,
          stock: finalStock,
          isAvailable: finalStock > 0,
        },
        transaction: t,
      });

      if (!created) {
        await record.update(
          {
            stock: finalStock,
            isAvailable: finalStock > 0,
          },
          { transaction: t }
        );
      }
    }

    // 🔥 Recalculate stock for affected variants
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
      message: "Store inventory updated successfully",
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* ================= UPDATE SINGLE STOCK ================= */
exports.updateStock = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { storeId, variantId, stock } = req.body;

    if (!storeId || !variantId) {
      throw new Error("storeId and variantId are required");
    }

    const finalStock = Number(stock) || 0;

    const [record, created] = await StoreInventory.findOrCreate({
      where: {
        storeId,
        variantId,
      },
      defaults: {
        storeId,
        variantId,
        stock: finalStock,
        isAvailable: finalStock > 0,
      },
      transaction: t,
    });

    if (!created) {
      await record.update(
        {
          stock: finalStock,
          isAvailable: finalStock > 0,
        },
        { transaction: t }
      );
    }

    // 🔥 Update total stock
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

    await t.commit();

    res.json({
      success: true,
      message: "Stock updated successfully",
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



/* ================= GET STORE INVENTORY ================= */
exports.getStoreInventory = async (req, res) => {
  try {
    const { storeId } = req.params;

    const inventory = await StoreInventory.findAll({
      where: { storeId },
      include: [
        {
          model: ProductVariant,
          as: "variant",
          attributes: ["id", "variantCode", "totalStock", "stockStatus"],
        },
      ],
      order: [["variantId", "ASC"]],
    });

    res.json({
      success: true,
      count: inventory.length,
      data: inventory,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





exports.getProductStock = async (req, res) => {
  try {
    const { storeId, productId } = req.params;

    const variants = await ProductVariant.findAll({
      where: { productId },
      include: [
        {
          model: StoreInventory,
          as: "storeInventory",
          required: false,
          attributes: ["stock", "storeId"],
        },
      ],
    });

    const formatted = variants.map((variant) => {
      const inventories = variant.storeInventory || [];

      // 🔥 store-specific stock
      const storeInventory = inventories.find(
        (inv) => String(inv.storeId) === String(storeId)
      );

      // 🔥 total stock across all stores
      const totalStock = inventories.reduce(
        (sum, inv) => sum + (inv.stock || 0),
        0
      );

      return {
        variantId: variant.id,
        variantCode: variant.variantCode,

        totalStock, // ✅ sum of all stores
        stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",

        stock: storeInventory ? storeInventory.stock : 0, // ✅ store-specific
        isAvailable: storeInventory ? storeInventory.stock > 0 : false,
      };
    });

    return res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* ================= GET VARIANT STOCK ================= */
exports.getVariantStock = async (req, res) => {
  try {
    const { variantId } = req.params;

    const stock = await StoreInventory.findAll({
      where: { variantId },
    });

    const formatted = stock.map((item) => ({
      storeId: item.storeId,
      stock: item.stock,
      isAvailable: item.isAvailable,
    }));

    res.json({
      success: true,
      data: formatted,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= DELETE SINGLE INVENTORY ================= */
exports.deleteStoreInventory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { storeId, variantId } = req.params;

    if (!storeId || !variantId) {
      throw new Error("storeId and variantId are required");
    }

    const deletedCount = await StoreInventory.destroy({
      where: { storeId, variantId },
      transaction: t,
    });

    if (deletedCount === 0) {
      throw new Error("Inventory not found");
    }

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

    await t.commit();

    res.json({
      success: true,
      message: "Inventory deleted successfully",
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= DELETE ALL VARIANT INVENTORY ================= */
exports.deleteVariantInventory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { variantId } = req.params;

    await StoreInventory.destroy({
      where: { variantId },
      transaction: t,
    });

    await ProductVariant.update(
      {
        totalStock: 0,
        stockStatus: "Out of Stock",
      },
      {
        where: { id: variantId },
        transaction: t,
      }
    );

    await t.commit();

    res.json({
      success: true,
      message: "All variant inventory deleted",
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= DELETE STORE INVENTORY ================= */
exports.deleteStoreAllInventory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { storeId } = req.params;

    const records = await StoreInventory.findAll({
      where: { storeId },
      attributes: ["variantId"],
      transaction: t,
    });

    const variantIds = [...new Set(records.map(r => r.variantId))];

    await StoreInventory.destroy({
      where: { storeId },
      transaction: t,
    });

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
      message: "Store inventory deleted successfully",
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};