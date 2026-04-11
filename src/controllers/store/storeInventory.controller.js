// const sequelize = require("../../config/db");
// const StoreInventory = require("../../models/products/StoreInventory.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// // const VariantSize = require("../../models/productVariants/variantSize.model");



// exports.createStoreInventory = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { storeId, inventory } = req.body;

//     if (!storeId) throw new Error("storeId is required");
//     if (!Array.isArray(inventory) || inventory.length === 0) {
//       throw new Error("inventory must be a non-empty array");
//     }

//     // Process each inventory item - update if exists, create if not
//     for (const item of inventory) {
//       const [inventoryRecord, created] = await StoreInventory.findOrCreate({
//         where: {
//           storeId,
//           productId: item.productId,
//           variantId: item.variantId,
//         },
//         defaults: {
//           storeId,
//           productId: item.productId,
//           variantId: item.variantId,
//           stock: item.stock || 0,
//           isAvailable: (item.stock || 0) > 0,
//         },
//         transaction: t,
//       });

//       // If record already exists, update it
//       if (!created) {
//         await inventoryRecord.update(
//           {
//             stock: item.stock || 0,
//             isAvailable: (item.stock || 0) > 0,
//           },
//           { transaction: t }
//         );
//       }
//     }

//     // 🔥 Recalculate total stock per variant
//     const variantIds = [...new Set(inventory.map(i => i.variantId))];

//     for (const variantId of variantIds) {
//       // Get all size IDs for this variant
//       const variantSizes = await VariantSize.findAll({
//         where: { variantId },
//         attributes: ['id'],
//         transaction: t,
//       });
      
//       const sizeIds = variantSizes.map(size => size.id);
      
//       let totalStock = 0;
      
//       // Sum stock across all sizes
//       if (sizeIds.length > 0) {
//         totalStock = await StoreInventory.sum("stock", {
//           where: { 
//             variantSizeId: sizeIds 
//           },
//           transaction: t,
//         });
//       }

//       await ProductVariant.update(
//         {
//           totalStock: totalStock || 0,
//           stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",
//         },
//         {
//           where: { id: variantId },
//           transaction: t,
//         }
//       );
      
//       console.log(`Updated variant ${variantId}: total stock = ${totalStock || 0}`);
//       console.log(`Size IDs for variant ${variantId}: ${sizeIds.join(', ')}`);
//     }

//     await t.commit();

//     res.json({
//       success: true,
//       message: "Store inventory updated successfully",
//     });

//   } catch (error) {
//     await t.rollback();
//     console.error("Store inventory error:", error);
    
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



// exports.updateStock = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { storeId, variantId, variantSizeId, stock } = req.body;

//     if (!storeId || !variantId || !variantSizeId) {
//       throw new Error("storeId, variantId, variantSizeId required");
//     }

//     const finalStock = Number(stock) || 0;

//     // 🔥 Update stock for that specific size in that store
//     const [record, created] = await StoreInventory.findOrCreate({
//       where: {
//         storeId,
//         variantId,
//         variantSizeId,
//       },
//       defaults: {
//         storeId,
//         variantId,
//         variantSizeId,
//         productId: null, // optional if you want
//         stock: finalStock,
//         isAvailable: finalStock > 0,
//       },
//       transaction: t,
//     });

//     if (!created) {
//       await record.update(
//         {
//           stock: finalStock,
//           isAvailable: finalStock > 0,
//         },
//         { transaction: t }
//       );
//     }

//     // 🔥 VERY IMPORTANT → update variant total stock
//     const totalStock = await StoreInventory.sum("stock", {
//       where: { variantId },
//       transaction: t,
//     });

//     await ProductVariant.update(
//       {
//         totalStock: totalStock || 0,
//         stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",
//       },
//       {
//         where: { id: variantId },
//         transaction: t,
//       }
//     );

//     await t.commit();

//     res.json({
//       success: true,
//       message: "Stock updated successfully",
//     });

//   } catch (error) {
//     await t.rollback();

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


// exports.getStoreInventory = async (req, res) => {
//   try {
//     const { storeId } = req.params;

//     const inventory = await StoreInventory.findAll({
//       where: { storeId },
//       include: [
//         {
//           model: ProductVariant,
//           as: "variant",
//           attributes: ["id", "variantCode", "totalStock", "stockStatus"]
//         },
//         {
//           model: VariantSize,
//           as: "size",
//           attributes: ["id", "length", "diameter"],
//         },
//       ],
//       order: [["variantId", "ASC"]],
//     });

//     res.json({
//       success: true,
//       count: inventory.length,
//       data: inventory,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.getProductStock = async (req, res) => {
//   try {
//     const { storeId, productId } = req.params;

//     const inventory = await StoreInventory.findAll({
//       where: { storeId, productId },
//       include: [
//         {
//           model: ProductVariant,
//           as: "variant",
//           attributes: ["id", "variantCode", "totalStock", "stockStatus"]
//         },
//         {
//           model: VariantSize,
//           as: "size",
//           attributes: ["id", "length", "diameter"],
//         },
//       ],
//     });

//    res.json({
//       success: true,
//       count: inventory.length,
//       data: inventory,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.getVariantStock = async (req, res) => {
//   try {
//     const { variantId } = req.params;

//     const stock = await StoreInventory.findAll({
//       where: { variantId },
//       include: [
//         {
//           model: VariantSize,
//           as: "size",
//           attributes: ["id", "length", "diameter"],
//         },
//       ],
//     });

//     // 🔥 Format clean response
//     const formatted = stock.map((item) => ({
//       variantSizeId: item.variantSizeId,
//       size: item.VariantSize?.size,
//       stock: item.stock,
//       isAvailable: item.isAvailable,
//     }));

//     res.json({
//       success: true,
//       data: formatted,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: error.message,
//     });
//   }
// };

// exports.deleteStoreInventory = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { storeId, variantId, variantSizeId } = req.params;

//     if (!storeId || !variantId || !variantSizeId) {
//       throw new Error("storeId, variantId, and variantSizeId are required");
//     }

//     // Find and delete the inventory record
//     const deletedCount = await StoreInventory.destroy({
//       where: {
//         storeId,
//         variantId,
//         variantSizeId,
//       },
//       transaction: t,
//     });

//     if (deletedCount === 0) {
//       throw new Error("Inventory record not found");
//     }

//     // 🔥 Recalculate total stock for the variant
//     const totalStock = await StoreInventory.sum("stock", {
//       where: { variantId },
//       transaction: t,
//     });

//     await ProductVariant.update(
//       {
//         totalStock: totalStock || 0,
//         stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",
//       },
//       {
//         where: { id: variantId },
//         transaction: t,
//       }
//     );

//     await t.commit();

//     res.json({
//       success: true,
//       message: "Inventory deleted successfully",
//       data: {
//         variantId,
//         updatedTotalStock: totalStock || 0,
//       },
//     });

//   } catch (error) {
//     await t.rollback();
//     console.error("Delete inventory error:", error);
    
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Delete all inventory for a specific variant (across all stores)
// exports.deleteVariantInventory = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { variantId } = req.params;

//     if (!variantId) {
//       throw new Error("variantId is required");
//     }

//     // Get all inventory records for this variant
//     const inventoryRecords = await StoreInventory.findAll({
//       where: { variantId },
//       attributes: ['id', 'storeId', 'variantSizeId', 'stock'],
//       transaction: t,
//     });

//     if (inventoryRecords.length === 0) {
//       throw new Error(`No inventory found for variant ${variantId}`);
//     }

//     // Delete all inventory records for this variant
//     const deletedCount = await StoreInventory.destroy({
//       where: { variantId },
//       transaction: t,
//     });

//     // Update variant stock to 0
//     await ProductVariant.update(
//       {
//         totalStock: 0,
//         stockStatus: "Out of Stock",
//       },
//       {
//         where: { id: variantId },
//         transaction: t,
//       }
//     );

//     await t.commit();

//     res.json({
//       success: true,
//       message: `Deleted ${deletedCount} inventory records for variant ${variantId}`,
//       data: {
//         variantId,
//         deletedCount,
//         records: inventoryRecords,
//       },
//     });

//   } catch (error) {
//     await t.rollback();
//     console.error("Delete variant inventory error:", error);
    
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Delete all inventory for a specific store
// exports.deleteStoreAllInventory = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const { storeId } = req.params;

//     if (!storeId) {
//       throw new Error("storeId is required");
//     }

//     // Get all inventory records for this store
//     const inventoryRecords = await StoreInventory.findAll({
//       where: { storeId },
//       attributes: ['id', 'variantId', 'variantSizeId', 'stock'],
//       transaction: t,
//     });

//     if (inventoryRecords.length === 0) {
//       throw new Error(`No inventory found for store ${storeId}`);
//     }

//     // Get unique variant IDs to update
//     const variantIds = [...new Set(inventoryRecords.map(record => record.variantId))];

//     // Delete all inventory for this store
//     const deletedCount = await StoreInventory.destroy({
//       where: { storeId },
//       transaction: t,
//     });

//     // Recalculate total stock for each affected variant
//     for (const variantId of variantIds) {
//       const totalStock = await StoreInventory.sum("stock", {
//         where: { variantId },
//         transaction: t,
//       });

//       await ProductVariant.update(
//         {
//           totalStock: totalStock || 0,
//           stockStatus: totalStock > 0 ? "In Stock" : "Out of Stock",
//         },
//         {
//           where: { id: variantId },
//           transaction: t,
//         }
//       );
//     }

//     await t.commit();

//     res.json({
//       success: true,
//       message: `Deleted ${deletedCount} inventory records for store ${storeId}`,
//       data: {
//         storeId,
//         deletedCount,
//         affectedVariants: variantIds,
//       },
//     });

//   } catch (error) {
//     await t.rollback();
//     console.error("Delete store inventory error:", error);
    
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };





const sequelize = require("../../config/db");
const StoreInventory = require("../../models/products/StoreInventory.model");
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