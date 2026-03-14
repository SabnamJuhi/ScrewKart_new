const { FeaturedCategory, Category, sequelize } = require("../../models");


exports.addFeaturedCategories = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    let { categoryIds } = req.body;

    if (!Array.isArray(categoryIds) || !categoryIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "categoryIds array is required",
      });
    }

    // ✅ Remove duplicate IDs from request
    categoryIds = [...new Set(categoryIds)];

    // ✅ Validate categories exist
    const existingCategories = await Category.findAll({
      where: { id: categoryIds },
      attributes: ["id"],
      transaction,
    });

    const validIds = existingCategories.map((c) => c.id);

    if (!validIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No valid categories found",
      });
    }

    // ✅ Check already featured categories
    const alreadyFeatured = await FeaturedCategory.findAll({
      where: { categoryId: validIds },
      attributes: ["categoryId"],
      transaction,
    });

    const alreadyFeaturedIds = alreadyFeatured.map((f) => f.categoryId);

    // ✅ Filter only new categories
    const newCategoryIds = validIds.filter(
      (id) => !alreadyFeaturedIds.includes(id)
    );

    if (!newCategoryIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Some categories are already featured",
      });
    }

    // ✅ Get current max sortOrder
    const lastFeatured = await FeaturedCategory.findOne({
      order: [["sortOrder", "DESC"]],
      transaction,
    });

    let startOrder = lastFeatured ? lastFeatured.sortOrder + 1 : 1;

    const rows = newCategoryIds.map((id, index) => ({
      categoryId: id,
      sortOrder: startOrder + index,
      isActive: true,
    }));

    await FeaturedCategory.bulkCreate(rows, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Featured categories added successfully",
      addedCategoryIds: newCategoryIds,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Add Featured Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getFeaturedCategories = async (req, res) => {
  try {
    const featured = await FeaturedCategory.findAll({
      where: { isActive: true },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "isActive"],
        },
      ],
      order: [["sortOrder", "ASC"]],
    });

    return res.json({
      success: true,
      data: featured,
    });
  } catch (error) {
    console.error("Get Featured Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.removeFeaturedCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await FeaturedCategory.findByPk(id);
    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    await row.destroy();

    return res.json({
      success: true,
      message: "Removed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateFeaturedCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, isActive, sortOrder } = req.body;

    const row = await FeaturedCategory.findByPk(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Featured category not found",
      });
    }

    // Optional: If categoryId is being updated, validate it exists
    if (categoryId) {
      const categoryExists = await Category.findByPk(categoryId);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }
      row.categoryId = categoryId;
    }

    // Update fields if provided
    if (typeof isActive !== "undefined") {
      row.isActive = isActive;
    }

    if (typeof sortOrder !== "undefined") {
      row.sortOrder = sortOrder;
    }

    await row.save();

    return res.json({
      success: true,
      message: "Featured category updated successfully",
      data: row,
    });
  } catch (error) {
    console.error("Update Featured Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};