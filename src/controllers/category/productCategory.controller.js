const { ProductCategory, Product } = require("../../models");
const sequelize = require("../../config/db");

exports.createProductCategory = async (req, res) => {
  try {
    const { name, categoryId, subCategoryId, brandName } = req.body;

    if (!name || !categoryId || !subCategoryId) {
      return res.status(400).json({
        message: "name, categoryId and subCategoryId are required",
      });
    }

    const productCategory = await ProductCategory.create({
      name,
      categoryId,
      subCategoryId,
      brandName,
    });

    res.status(201).json({
      success: true,
      data: productCategory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getAllProductCategories = async (req, res) => {
  try {
    const data = await ProductCategory.findAll();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;

    const data = await ProductCategory.findAll({
      where: { subCategoryId },
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const data = await ProductCategory.findAll({
      where: { categoryId },
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// exports.updateProductCategory = async (req, res) => {
//   try {
//     const { id } = req.params

//     await ProductCategory.update(req.body, {
//       where: { id }
//     })

//     res.json({
//       success: true,
//       message: "Product category updated"
//     })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }

// exports.deleteProductCategory = async (req, res) => {
//   try {
//     const data = await ProductCategory.findByPk(req.params.id)
//     if (!data) {
//       return res.status(404).json({ message: "Not found" })
//     }

//     await data.destroy()
//     res.status(200).json({ success: true, message: "Deleted successfully" })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }

exports.updateProductCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, isActive, categoryId, subCategoryId, brandName } = req.body;

    const productCategory = await ProductCategory.findByPk(id, {
      transaction: t,
    });
    if (!productCategory) {
      await t.rollback();
      return res.status(404).json({ message: "Product category not found" });
    }

    // 1. Update the Product Category itself
    await productCategory.update(
      {
        name: name ?? productCategory.name,
        categoryId: categoryId ?? productCategory.categoryId,
        subCategoryId: subCategoryId ?? productCategory.subCategoryId,
        brandName: productCategory.brandName,
        isActive: isActive !== undefined ? isActive : productCategory.isActive,
      },
      { transaction: t },
    );

    // 2. Cascade Logic: If isActive status is provided in the request body
    if (isActive !== undefined) {
      // Update all Products linked to this specific Product Category
      await Product.update(
        { isActive: isActive },
        {
          where: { productCategoryId: id },
          transaction: t,
        },
      );
    }

    await t.commit();

    res.json({
      success: true,
      message:
        isActive !== undefined
          ? `Product Category and its products ${isActive ? "activated" : "deactivated"} successfully`
          : "Product category updated successfully",
      data: productCategory,
    });
  } catch (error) {
    await t.rollback();
    console.error("UpdateProductCategory Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product category tree",
      error: error.message,
    });
  }
};

exports.deleteProductCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const productCategory = await ProductCategory.findByPk(id, {
      transaction: t,
    });
    if (!productCategory) {
      await t.rollback();
      return res.status(404).json({ message: "Product Category not found" });
    }

    // 1. Deactivate ProductCategory
    await productCategory.update({ isActive: false }, { transaction: t });

    // 2. Deactivate all Products under this Product Category
    await Product.update(
      { isActive: false },
      { where: { productCategoryId: id }, transaction: t },
    );

    await t.commit();
    res.status(200).json({
      success: true,
      message: "Product Category and all related Products have been disabled.",
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};
