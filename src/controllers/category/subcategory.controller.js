const { Category, SubCategory, ProductCategory, Product } = require("../../models")
const sequelize = require("../../config/db");

exports.createSubCategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body

    if (!name || !categoryId) {
      return res.status(400).json({ message: "Name and Category ID required" })
    }

    const category = await Category.findByPk(categoryId)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    const subCategory = await SubCategory.create({
      name,
      categoryId
    })

    res.status(201).json({
      success: true,
      message: "Subcategory created",
      data: subCategory
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
exports.getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.findAll({
      include: {
        model: Category,
        as: "category", 
        attributes: ["id", "name"]
      }
    })

    res.status(200).json({ success: true, data: subCategories })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


exports.getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params

    const subCategories = await SubCategory.findAll({
      where: {
        categoryId,
        isActive: true
      }
    })

    res.status(200).json({ success: true, data: subCategories })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// exports.updateSubCategory = async (req, res) => {
//   try {
//     const { id } = req.params
//     const { name } = req.body

//     const subCategory = await SubCategory.findByPk(id)
//     if (!subCategory) {
//       return res.status(404).json({ message: "Subcategory not found" })
//     }

//     subCategory.name = name || subCategory.name
//     await subCategory.save()

//     res.status(200).json({
//       success: true,
//       message: "Subcategory updated",
//       data: subCategory
//     })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }

// exports.deleteSubCategory = async (req, res) => {
//   try {
//     const { id } = req.params

//     const subCategory = await SubCategory.findByPk(id)
//     if (!subCategory) {
//       return res.status(404).json({ message: "Subcategory not found" })
//     }

//     subCategory.isActive = false
//     await subCategory.save()

//     res.status(200).json({
//       success: true,
//       message: "Subcategory deleted"
//     })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }

exports.updateSubCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const subCategory = await SubCategory.findByPk(id, { transaction: t });
    if (!subCategory) {
      await t.rollback();
      return res.status(404).json({ message: "Subcategory not found" });
    }

    // 1. Update the SubCategory itself
    await subCategory.update({
      name: name || subCategory.name,
      isActive: isActive !== undefined ? isActive : subCategory.isActive
    }, { transaction: t });

    // 2. Cascade Logic: If isActive status is provided in the request
    if (isActive !== undefined) {
      // Update all ProductCategories linked to this SubCategory
      await ProductCategory.update(
        { isActive: isActive },
        { where: { subCategoryId: id }, transaction: t }
      );

      // Update all Products linked to this SubCategory
      await Product.update(
        { isActive: isActive },
        { where: { subCategoryId: id }, transaction: t }
      );
    }

    await t.commit();

    res.status(200).json({
      success: true,
      message: `Subcategory and related items ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: subCategory
    });
  } catch (error) {
    await t.rollback();
    console.error("UpdateSubCategory Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update subcategory tree", 
      error: error.message 
    });
  }
};


exports.deleteSubCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findByPk(id, { transaction: t });
    if (!subCategory) {
      await t.rollback();
      return res.status(404).json({ message: "Subcategory not found" });
    }

    // 1. Deactivate SubCategory
    await subCategory.update({ isActive: false }, { transaction: t });

    // 2. Deactivate all ProductCategories under this SubCategory
    await ProductCategory.update(
      { isActive: false },
      { where: { subCategoryId: id }, transaction: t }
    );

    // 3. Deactivate all Products under this SubCategory
    await Product.update(
      { isActive: false },
      { where: { subCategoryId: id }, transaction: t }
    );

    await t.commit();
    res.status(200).json({ 
      success: true, 
      message: "Subcategory, its Product Categories, and all related Products have been disabled." 
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};