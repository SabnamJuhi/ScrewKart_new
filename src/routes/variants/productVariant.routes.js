const router = require("express").Router()
const {
  upsertVariants,
  getVariantsByProduct,
  deleteVariantsbyProduct,
  deleteVariantByCode,
  uploadVariantImages
} = require("../../controllers/products/productVariant.controller")
const upload = require('../../middleware/upload');


router.post('/variants/uploadImages', upload.array('images', 5), uploadVariantImages);
router.post("/", upsertVariants)
router.get("/:productId", getVariantsByProduct)
router.delete("/product/:productId", deleteVariantsbyProduct)
router.delete("/:variantCode", deleteVariantByCode)

module.exports = router
