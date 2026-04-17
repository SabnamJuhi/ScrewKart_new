const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Root upload folder
const BASE_DIR = path.join(__dirname, "../../uploads/delivery_boys");

// Ensure folders exist
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = BASE_DIR;

    switch (file.fieldname) {
      case "panCard":
        folder = path.join(BASE_DIR, "pan");
        break;
      case "aadharCard":
        folder = path.join(BASE_DIR, "aadhar");
        break;
      case "drivingLicense":
        folder = path.join(BASE_DIR, "license");
        break;
      case "profilePhoto":
        folder = path.join(BASE_DIR, "profile");
        break;
      default:
        folder = BASE_DIR;
    }

    createDir(folder);
    cb(null, folder);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// Allow image + pdf only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload.fields([
  { name: "panCard", maxCount: 1 },
  { name: "aadharCard", maxCount: 1 },
  { name: "drivingLicense", maxCount: 1 },
  { name: "profilePhoto", maxCount: 1 },
]);