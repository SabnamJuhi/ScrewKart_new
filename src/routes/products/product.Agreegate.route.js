const express = require("express")
const router = express.Router()

const productController = require("../../controllers/product.aggregate.controller")
const upload = require('../../middleware/upload');
// const upload = require("../../middleware/uploadCloudinary");
const { createProduct } = require("../../controllers/AggregateProducts/createProductDetails.controller");
const { updateProductDetails } = require("../../controllers/AggregateProducts/updateProductDetails.controller");
const { softDeleteProduct } = require("../../controllers/AggregateProducts/softDeleteProductDetails.controller");
const { deleteProductPermanently } = require("../../controllers/AggregateProducts/deleteProductPermanently.controller");
const { getAllProductsDetails } = require("../../controllers/AggregateProducts/getAllProductDetails.controller");
const { getProductById } = require("../../controllers/AggregateProducts/getProductDetailsById.controller");
const { getProductFilters } = require("../../controllers/AggregateProducts/getProductFilters.controller");
const { getFilteredProducts } = require("../../controllers/AggregateProducts/getFilteredProduct.controller");

const adminAuth = require("../../middleware/admin.auth.middleware")
const {protected, optionalAuth} = require("../../middleware/user.logout.middleware")


// router.post("/products", upload.any(), productController.createProduct)
router.post("/products", upload.any(), adminAuth, createProduct)


// router.get("/filter", productController.getFilteredProducts);
// router.get("/filterd-product", productController.getProductFilters);
router.get("/filters", getProductFilters);        //  filter metadata
router.get("/products", optionalAuth, getFilteredProducts); 

// router.get("/", productController.getAllProductsDetails)
// router.get("/:id", productController.getProductById)
router.get("/", getAllProductsDetails)
router.get("/:id", getProductById)

// router.put("/:id", upload.any(), productController.updateProductDetails)
router.put("/:id", upload.any(), adminAuth, updateProductDetails)

// router.delete('/:id', productController.softDeleteProduct)
router.delete('/:id', adminAuth, softDeleteProduct)

// router.delete('/delete/:id', productController.deleteProductPermanently)
router.delete('/delete/:id', adminAuth, deleteProductPermanently)


module.exports = router
