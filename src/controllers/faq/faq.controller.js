// controllers/faq/faq.controller.js
const { FAQ } = require('../../models');
const {
  createFAQSchema,
  updateFAQSchema,
  faqIdSchema,
  bulkActionSchema
} = require('../../validations/faq.validation');
const { getPaginationOptions, formatPagination } = require('../../utils/paginate');

// Create FAQ (Admin only)
exports.createFAQ = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createFAQSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Add createdBy from authenticated admin
    const faqData = {
      ...value,
      createdBy: req.user?.id || null,
      updatedBy: req.user?.id || null
    };

    const faq = await FAQ.create(faqData);

    return res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: faq
    });
  } catch (error) {
    console.error('Create FAQ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create FAQ'
    });
  }
};

// Get all FAQs (with filters for Admin)
exports.getAllFAQs = async (req, res) => {
  try {
    const {
      category,
      isActive,
      isPublished,
      search,
      sortBy = 'order',
      sortOrder = 'ASC'
    } = req.query;

    const paginationOptions = getPaginationOptions(req.query);

    // Build where clause
    const whereClause = {};

    if (category) {
      whereClause.category = category;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (isPublished !== undefined) {
      whereClause.isPublished = isPublished === 'true';
    }

    if (search) {
      whereClause[Op.or] = [
        { question: { [Op.like]: `%${search}%` } },
        { answer: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await FAQ.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      ...paginationOptions
    });

    const response = formatPagination(
      { count, rows },
      paginationOptions.currentPage,
      paginationOptions.limit
    );

    return res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Get FAQs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs'
    });
  }
};

// Get single FAQ by ID
exports.getFAQById = async (req, res) => {
  try {
    // Validate ID
    const { error } = faqIdSchema.validate({ id: req.params.id });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid FAQ ID'
      });
    }

    const faq = await FAQ.findByPk(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // Increment view count
    await faq.increment('views');

    return res.json({
      success: true,
      data: faq
    });
  } catch (error) {
    console.error('Get FAQ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ'
    });
  }
};

// Update FAQ (Admin only)
exports.updateFAQ = async (req, res) => {
  try {
    // Validate ID
    const idValidation = faqIdSchema.validate({ id: req.params.id });
    if (idValidation.error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid FAQ ID'
      });
    }

    // Validate update data
    const { error, value } = updateFAQSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const faq = await FAQ.findByPk(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // Add updatedBy
    value.updatedBy = req.user?.id || null;

    await faq.update(value);

    return res.json({
      success: true,
      message: 'FAQ updated successfully',
      data: faq
    });
  } catch (error) {
    console.error('Update FAQ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update FAQ'
    });
  }
};

// Delete FAQ (Admin only - soft delete)
exports.deleteFAQ = async (req, res) => {
  try {
    // Validate ID
    const { error } = faqIdSchema.validate({ id: req.params.id });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid FAQ ID'
      });
    }

    const faq = await FAQ.findByPk(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    await faq.destroy(); // Soft delete (if paranoid: true)

    return res.json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    console.error('Delete FAQ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ'
    });
  }
};

// Bulk delete FAQs (Admin only)
exports.bulkDeleteFAQs = async (req, res) => {
  try {
    // Validate IDs
    const { error, value } = bulkActionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { ids } = value;

    const deletedCount = await FAQ.destroy({
      where: {
        id: ids
      }
    });

    return res.json({
      success: true,
      message: `${deletedCount} FAQs deleted successfully`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Bulk Delete FAQs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete FAQs'
    });
  }
};

// Toggle FAQ status (Admin only)
exports.toggleFAQStatus = async (req, res) => {
  try {
    // Validate ID
    const { error } = faqIdSchema.validate({ id: req.params.id });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid FAQ ID'
      });
    }

    const faq = await FAQ.findByPk(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // Toggle isActive status
    await faq.update({
      isActive: !faq.isActive,
      updatedBy: req.user?.id || null
    });

    return res.json({
      success: true,
      message: `FAQ ${faq.isActive ? 'activated' : 'deactivated'} successfully`,
      data: faq
    });
  } catch (error) {
    console.error('Toggle FAQ Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle FAQ status'
    });
  }
};

// Get FAQ categories (for filter dropdown)
exports.getFAQCategories = async (req, res) => {
  try {
    const categories = await FAQ.findAll({
      attributes: ['category'],
      group: ['category'],
      where: { isActive: true },
      order: [['category', 'ASC']]
    });

    const categoryList = categories.map(c => c.category).filter(Boolean);

    return res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    console.error('Get FAQ Categories Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ categories'
    });
  }
};

// Mark FAQ as helpful/not helpful (Public)
exports.markHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body; // true for helpful, false for not helpful

    // Validate ID
    const idValidation = faqIdSchema.validate({ id });
    if (idValidation.error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid FAQ ID'
      });
    }

    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // Increment appropriate counter
    if (helpful) {
      await faq.increment('helpfulCount');
    } else {
      await faq.increment('notHelpfulCount');
    }

    return res.json({
      success: true,
      message: 'Thank you for your feedback'
    });
  } catch (error) {
    console.error('Mark Helpful Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
};