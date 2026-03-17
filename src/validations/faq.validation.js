// validations/faq.validation.js
const Joi = require('joi');

const createFAQSchema = Joi.object({
  question: Joi.string().required().min(5).max(1000).messages({
    'string.empty': 'Question is required',
    'string.min': 'Question must be at least 5 characters long',
    'string.max': 'Question cannot exceed 1000 characters'
  }),
  answer: Joi.string().required().min(10).max(10000).messages({
    'string.empty': 'Answer is required',
    'string.min': 'Answer must be at least 10 characters long',
    'string.max': 'Answer cannot exceed 10000 characters'
  }),
  category: Joi.string().max(100).optional().default('General'),
  order: Joi.number().integer().min(0).optional().default(0),
  isActive: Joi.boolean().optional().default(true),
  isPublished: Joi.boolean().optional().default(true)
});

const updateFAQSchema = Joi.object({
  question: Joi.string().min(5).max(1000).optional(),
  answer: Joi.string().min(10).max(10000).optional(),
  category: Joi.string().max(100).optional(),
  order: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  isPublished: Joi.boolean().optional()
}).min(1); // At least one field to update

const faqIdSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const bulkActionSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required()
});

module.exports = {
  createFAQSchema,
  updateFAQSchema,
  faqIdSchema,
  bulkActionSchema
};