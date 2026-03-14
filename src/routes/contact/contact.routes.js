const express = require("express");
const router = express.Router();
const uploadEnquiryFiles = require("../../middleware/uploadEnquiryFiles.middleware");

const {
  sendContactEnquiry,
} = require("../../controllers/contact/contact.controller");

router.post("/", uploadEnquiryFiles, sendContactEnquiry);

module.exports = router;
