const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

const {
  bulkCreateProductsFromExcel,
} = require("../../controllers/bulkProductUpload/BulkProductUpload.controller");

router.post(
  "/bulkUploadProducts",
  upload.single("file"),
  bulkCreateProductsFromExcel
);

module.exports = router;
