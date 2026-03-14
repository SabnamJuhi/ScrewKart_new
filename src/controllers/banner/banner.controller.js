const Banner = require("../../models/banner/banner.model");
// const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const path = require("path");


/* CREATE BANNER */
exports.createBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const { title, subtitle, cta, link } = req.body;
     const imagePath = `/uploads/products/${req.file.filename}`;

    const banner = await Banner.create({
      title,
      subtitle,
      cta,
      link,
      imageUrl: imagePath,
    });

    res.json({ success: true, data: banner, message: "Banner created" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Create failed", error: err.message });
  }
};


/* GET ALL ACTIVE BANNERS */
exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.findAll({
      where: { isActive: true },
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, data: banners });
  } catch (err) {
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};


/* UPDATE BANNER */
// exports.updateBanner = async (req, res) => {
//   try {
//     const banner = await Banner.findByPk(req.params.id);
//     if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });

//     // if new image uploaded → delete old from cloudinary
//     if (req.file) {
//       await cloudinary.uploader.destroy(banner.publicId);

//       banner.imageUrl = req.file.path;
//     }

//     const { title, subtitle, cta, link, isActive } = req.body;

//     await banner.update({ title, subtitle, cta, link, isActive });

//     res.json({ success: true, data: banner, message: "Banner updated" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Update failed" });
//   }
// };


/* UPDATE BANNER */
exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // ✅ If new image uploaded
    if (req.file) {
      // Delete old image from local storage
      if (banner.imageUrl) {
        const oldImagePath = path.join(
          __dirname,
          "../../",
          banner.imageUrl
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new image path
      banner.imageUrl = `/uploads/products/${req.file.filename}`;
    }

    const { title, subtitle, cta, link, isActive } = req.body;

    await banner.update({
      title,
      subtitle,
      cta,
      link,
      isActive,
      imageUrl: banner.imageUrl,
    });

    res.json({
      success: true,
      data: banner,
      message: "Banner updated",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Update failed",
      error: err.message,
    });
  }
};


/* DELETE BANNER (soft + cloudinary delete optional) */
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });

    // remove image from cloudinary
    await cloudinary.uploader.destroy(banner.publicId);

    await banner.destroy(); // or use isActive false

    res.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};
