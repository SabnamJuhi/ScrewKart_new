// const ProductVariant = require("../../models/products/productVariants/productVariant.model")
// const VariantImage = require("../../models/products/productVariants/variantImage.model")
// const VariantSize = require("../../models/products/productVariants/variantSize.model")

// exports.upsertVariants = async (req, res) => {
//   try {
//     const { productId, variants } = req.body

//     if (!productId || !Array.isArray(variants)) {
//       return res.status(400).json({
//         message: "productId and variants required"
//       })
//     }

//     // remove old variants
//     await ProductVariant.destroy({ where: { productId } })

//     const response = []

//     for (const v of variants) {
//       const variant = await ProductVariant.create({
//         productId,
//         variantCode: v.variantId,
//         colorName: v.color.name,
//         colorCode: v.color.code,
//         colorSwatch: v.color.swatch,
//         totalStock: v.totalStock,
//         stockStatus: v.stockStatus
//       })

//       // images
//       if (v.images?.length) {
//         await VariantImage.bulkCreate(
//           v.images.map(img => ({
//             variantId: variant.id,
//             imageUrl: img
//           }))
//         )
//       }

//       // sizes
//       if (v.sizes?.length) {
//         await VariantSize.bulkCreate(
//           v.sizes.map(s => ({
//             variantId: variant.id,
//             size: s.size,
//             chest: s.chest,
//             stock: s.stock
//           }))
//         )
//       }

//       response.push(variant)
//     }

//     res.status(201).json({
//       message: "Product variants saved",
//       data: response
//     })
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to save variants",
//       error: error.message
//     })
//   }
// }

// exports.getVariantsByProduct = async (req, res) => {
//   try {
//     const { productId } = req.params

//     const variants = await ProductVariant.findAll({
//       where: { productId },
//       include: [
//         { model: VariantImage, attributes: ["imageUrl"] },
//         { model: VariantSize, attributes: ["size", "chest", "stock"] }
//       ]
//     })

//     const formatted = variants.map(v => ({
//       variantId: v.variantId,
//       color: {
//         name: v.colorName,
//         code: v.colorCode,
//         swatch: v.colorSwatch
//       },
//       images: v.VariantImages.map(i => i.imageUrl),
//       sizes: v.VariantSizes,
//       totalStock: v.totalStock,
//       stockStatus: v.stockStatus
//     }))

//     res.status(200).json({
//       productId,
//       variants: formatted
//     })
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to fetch variants",
//       error: error.message
//     })
//   }
// }

// exports.deleteVariants = async (req, res) => {
//   try {
//     const { productId } = req.params

//     await ProductVariant.destroy({ where: { productId } })

//     res.status(200).json({
//       message: "Variants deleted"
//     })
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to delete variants",
//       error: error.message
//     })
//   }
// }

// exports.deleteVariantByCode = async (req, res) => {
//   try {
//     const { variantCode } = req.params

//     if (!variantCode) {
//       return res.status(400).json({
//         message: "variantCode is required"
//       })
//     }

//     const variant = await ProductVariant.findOne({
//       where: { variantCode }
//     })

//     if (!variant) {
//       return res.status(404).json({
//         message: "Variant not found"
//       })
//     }

//     // delete child tables first (important!)
//     await VariantImage.destroy({
//       where: { variantId: variant.id }
//     })

//     await VariantSize.destroy({
//       where: { variantId: variant.id }
//     })

//     // delete parent
//     await variant.destroy()

//     res.status(200).json({
//       message: "Variant deleted successfully",
//       variantCode
//     })
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to delete variant",
//       error: error.message
//     })
//   }
// }









const sequelize = require("../../config/db")
const ProductVariant = require("../../models/productVariants/productVariant.model")
const VariantImage = require("../../models/productVariants/variantImage.model")
const VariantSize = require("../../models/productVariants/variantSize.model")

exports.upsertVariants = async (req, res) => {
  const t = await sequelize.transaction()

  try {
    const { productId, variants } = req.body

    if (!productId || !Array.isArray(variants)) {
      await t.rollback()
      return res.status(400).json({ message: "productId and variants required" })
    }

    // delete old variants
    await ProductVariant.destroy({ where: { productId }, transaction: t })

    for (const v of variants) {
      const variant = await ProductVariant.create(
        {
          productId,
          variantCode: v.variantId,
          colorName: v.color.name,
          colorCode: v.color.code,
          colorSwatch: v.color.swatch,
          totalStock: v.totalStock,
          stockStatus: v.stockStatus,
          isActive: true
        },
        { transaction: t }
      )

      if (v.images?.length) {
        await VariantImage.bulkCreate(
          v.images.map(img => ({
            variantId: variant.id,
            imageUrl: img
          })),
          { transaction: t }
        )
      }

      if (v.sizes?.length) {
        await VariantSize.bulkCreate(
          v.sizes.map(s => ({
            variantId: variant.id,
            size: s.size,
            chest: s.chest,
            stock: s.stock
          })),
          { transaction: t }
        )
      }
    }

    await t.commit()

    res.status(201).json({ message: "Variants saved successfully"})
  } catch (error) {
    await t.rollback()
    res.status(500).json({ message: "Failed to save variants", error: error.message })
  }
}

exports.updateVariantPartial = async (req, res) => {
  try {
    const { variantCode } = req.params
    const updates = req.body

    const variant = await ProductVariant.findOne({ where: { variantCode } })

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" })
    }

    await variant.update(updates)

    res.status(200).json({
      message: "Variant updated",
      data: variant
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to update variant",
      error: error.message
    })
  }
}


exports.getVariantsByProduct = async (req, res) => {
  try {
    const { productId } = req.params

    const variants = await ProductVariant.findAll({
      where: { productId, isActive: true },
      include: [
        { model: VariantImage, attributes: ["imageUrl"] },
        { model: VariantSize, attributes: ["size", "chest", "stock"] }
      ],
      order: [["id", "ASC"]]
    })

    const formatted = variants.map(v => ({
      variantId: v.variantCode,
      color: {
        name: v.colorName,
        code: v.colorCode,
        swatch: v.colorSwatch
      },
      images: v.VariantImages.map(i => i.imageUrl),
      sizes: v.VariantSizes,
      totalStock: v.totalStock,
      stockStatus: v.stockStatus
    }))

    return res.status(200).json({
      productId,
      variants: formatted
    })

  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch variants",
      error: error.message
    })
  }
}


exports.deleteVariantsbyProduct = async (req, res) => {
  try {
    const { productId } = req.params

    await ProductVariant.destroy({ where: { productId } })

    res.status(200).json({
      message: "Variants deleted"
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete variants",
      error: error.message
    })
  }
}

exports.deleteVariantByCode = async (req, res) => {
  try {
    const { variantCode } = req.params

    const variant = await ProductVariant.findOne({
      where: { variantCode, isActive: true }
    })

    if (!variant) {
      return res.status(404).json({
        message: "Variant not found"
      })
    }

    await variant.update({ isActive: false })

    res.status(200).json({
      message: "Variant deactivated successfully",
      variantCode
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete variant",
      error: error.message
    })
  }
}

// Add this helper to your controller
exports.uploadVariantImages = async (req, res) => {
  try {
    const { variantId } = req.body;
    const files = req.files; // Array of files from Multer

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "No images uploaded" });
    }

    const imageData = files.map(file => ({
      variantId: variantId,
      // Store the relative path that the browser will use
      imageUrl: `/uploads/variants/${file.filename}` 
    }));

    await VariantImage.bulkCreate(imageData);

    res.status(200).json({
      success: true,
      message: "Images uploaded and saved to database",
      data: imageData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};