const sequelize = require("../../config/db");
const StoreInventory = require("../../models/products/StoreInventory.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantSize = require("../../models/productVariants/variantSize.model");



exports.createStoreInventory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { storeId, inventory } = req.body;

    if (!storeId) throw new Error("storeId is required");
    if (!Array.isArray(inventory) || inventory.length === 0) {
      throw new Error("inventory must be a non-empty array");
    }

    // Process each inventory item - update if exists, create if not
    for (const item of inventory) {
      const [inventoryRecord, created] = await StoreInventory.findOrCreate({
        where: {
          storeId,
          productId: item.productId,
          variantId: item.variantId,
          variantSizeId: item.variantSizeId,
        },
        defaults: {
          storeId,
          productId: item.productId,
          variantId: item.variantId,
          variantSizeId: item.variantSizeId,
          stock: item.stock || 0,
          isAvailable: (item.stock || 0) > 0,
        },
        transaction: t,
      });

      // If record already exists, update it
      if (!created) {
        await inventoryRecord.update(
          {
            stock: item.stock || 0,
            isAvailable: (item.stock || 0) > 0,
          },
          { transaction: t }
        );
      }
    }

    // 🔥 Recalculate total stock per variant
    const variantIds = [...new Set(inventory.map(i => i.variantId))];

    for (const variantId of variantIds) {
      // Get all size IDs for this variant
      const variantSizes = await VariantSize.findAll({
        where: { variantId },
        attributes: ['id'],
        transaction: t,
      });
      
      const sizeIds = variantSizes.map(size => size.id);
      
      let totalStock = 0;
      
      // Sum stock across all sizes
      if (sizeIds.length > 0) {
        totalStock = await StoreInventory.sum("stock", {
          where: { 
            variantSizeId: sizeIds 
          },
          transaction: t,
        });
      }

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
      
      console.log(`Updated variant ${variantId}: total stock = ${totalStock || 0}`);
      console.log(`Size IDs for variant ${variantId}: ${sizeIds.join(', ')}`);
    }

    await t.commit();

    res.json({
      success: true,
      message: "Store inventory updated successfully",
    });

  } catch (error) {
    await t.rollback();
    console.error("Store inventory error:", error);
    
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



exports.updateStock = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { storeId, variantId, variantSizeId, stock } = req.body;

    if (!storeId || !variantId || !variantSizeId) {
      throw new Error("storeId, variantId, variantSizeId required");
    }

    const finalStock = Number(stock) || 0;

    // 🔥 Update stock for that specific size in that store
    const [record, created] = await StoreInventory.findOrCreate({
      where: {
        storeId,
        variantId,
        variantSizeId,
      },
      defaults: {
        storeId,
        variantId,
        variantSizeId,
        productId: null, // optional if you want
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

    // 🔥 VERY IMPORTANT → update variant total stock
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