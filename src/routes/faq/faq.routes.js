// routes/faq.routes.js
const express = require('express');
const router = express.Router();
const faqController = require('../../controllers/faq/faq.controller');
const adminAuthMiddleware = require('../../middleware/admin.auth.middleware');


// // Public routes
// router.get('/categories', faqController.getFAQCategories);
// router.get('/', faqController.getAllFAQs);
// router.get('/:id', faqController.getFAQById);
// router.post('/:id/feedback', faqController.markHelpful);

// // Admin routes (protected)
// router.post('/', adminAuthMiddleware, faqController.createFAQ);
// router.put('/:id', adminAuthMiddleware, faqController.updateFAQ);
// router.delete('/:id', adminAuthMiddleware, faqController.deleteFAQ);
// router.patch('/:id/toggle', adminAuthMiddleware, faqController.toggleFAQStatus);
// router.post('/bulk-delete', adminAuthMiddleware, faqController.bulkDeleteFAQs);

router.post("/", adminAuthMiddleware,faqController.createFAQ);
router.get("/", adminAuthMiddleware, faqController.getAllFAQs);
router.get("/:id", adminAuthMiddleware, faqController.getFAQById);
router.put("/:id", adminAuthMiddleware, faqController.updateFAQ);
router.delete("/:id", adminAuthMiddleware,  faqController.deleteFAQ);

module.exports = router;