const express = require("express");
const router = express.Router();
const {
  uploadAvatar,
  uploadCourse,
  uploadMaterial,
  cloudinary,
} = require("../config/cloudinary");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const User = require("../models/User");
const logger = require("../utils/logger");

// Upload avatar (Authenticated users)
router.post(
  "/avatar",
  authMiddleware,
  uploadAvatar.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Update user avatar
      const user = await User.findById(req.user.userId);

      // Delete old avatar from cloudinary if exists
      if (user.avatar && user.avatar.includes("cloudinary")) {
        const publicId = user.avatar
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }

      user.avatar = req.file.path;
      await user.save();

      logger.success(`Avatar uploaded for user: ${user.email}`);

      res.json({
        message: "Avatar berhasil diupload",
        avatar: req.file.path,
      });
    } catch (error) {
      logger.error("Upload avatar error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Upload course image (Admin only)
router.post(
  "/course",
  authMiddleware,
  adminMiddleware,
  uploadCourse.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      logger.success(`Course image uploaded: ${req.file.filename}`);

      res.json({
        message: "Image berhasil diupload",
        imageUrl: req.file.path,
      });
    } catch (error) {
      logger.error("Upload course image error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Upload material image (Admin only)
router.post(
  "/material",
  authMiddleware,
  adminMiddleware,
  uploadMaterial.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      logger.success(`Material image uploaded: ${req.file.filename}`);

      res.json({
        message: "Image berhasil diupload",
        imageUrl: req.file.path,
      });
    } catch (error) {
      logger.error("Upload material image error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete image (Admin only)
router.delete("/image", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || !imageUrl.includes("cloudinary")) {
      return res.status(400).json({ message: "Invalid image URL" });
    }

    const publicId = imageUrl.split("/").slice(-2).join("/").split(".")[0];
    await cloudinary.uploader.destroy(publicId);

    logger.success(`Image deleted: ${publicId}`);

    res.json({ message: "Image berhasil dihapus" });
  } catch (error) {
    logger.error("Delete image error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
