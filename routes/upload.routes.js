const express = require("express");
const router = express.Router();
const {
  uploadAvatar,
  uploadCourse,
  uploadCourseContent,
  uploadMaterial,
  cloudinary,
  extractPublicId,
} = require("../config/cloudinary");
const {
  authMiddleware,
  staffMiddleware,
  teacherMiddleware,
} = require("../middleware/auth");
const User = require("../models/User");
const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

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
        const publicId = extractPublicId(user.avatar);
        if (publicId) await cloudinary.uploader.destroy(publicId);
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

// Upload course image 
router.post(
  "/course",
  authMiddleware,
  teacherMiddleware,
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
  },
);

// Upload gambar deskripsi kelas / course content (Admin only)
router.post(
  "/course-content",
  authMiddleware,
  teacherMiddleware,
  uploadCourseContent.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      logger.success(`Course content image uploaded: ${req.file.filename}`);

      res.json({
        message: "Image berhasil diupload",
        imageUrl: req.file.path,
      });
    } catch (error) {
      logger.error("Upload course content image error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// Upload material image
router.post(
  "/material",
  authMiddleware,
  teacherMiddleware,
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
  },
);

// Delete image (Admin only)
router.delete("/image", authMiddleware, teacherMiddleware, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || !imageUrl.includes("cloudinary")) {
      return res.status(400).json({ message: "Invalid image URL" });
    }

    const publicId = extractPublicId(imageUrl);
    if (!publicId) {
      return res
        .status(400)
        .json({ message: "Gagal mengekstrak public_id dari URL" });
    }

    await cloudinary.uploader.destroy(publicId);

    logger.success(`Image deleted: ${publicId}`);
    res.json({ message: "Image berhasil dihapus" });
  } catch (error) {
    logger.error("Delete image error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Delete image via sendBeacon (dipanggil browser saat tab ditutup/refresh paksa).
// Tidak pakai authMiddleware karena sendBeacon tidak bisa set header Authorization —
// token dikirim di body dan diverifikasi manual di sini.
// Body dikirim sebagai text/plain (bukan application/json) untuk menghindari CORS preflight,
// makanya pakai express.text() khusus untuk route ini, lalu di-parse manual.
router.post(
  "/image/beacon",
  express.text({ type: "*/*" }),
  async (req, res) => {
    try {
      let payload;
      try {
        payload = JSON.parse(req.body || "{}");
      } catch {
        return res.status(400).json({ message: "Body tidak valid" });
      }

      const { imageUrl, token } = payload;
      if (!token) {
        return res.status(401).json({ message: "Token diperlukan" });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
      } catch {
        return res.status(401).json({ message: "Token tidak valid" });
      }

      if (decoded.role !== "admin") {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      if (!imageUrl || !imageUrl.includes("cloudinary")) {
        return res.status(400).json({ message: "Invalid image URL" });
      }

      const publicId = extractPublicId(imageUrl);
      if (!publicId) {
        return res.status(400).json({ message: "Gagal mengekstrak public_id" });
      }

      await cloudinary.uploader.destroy(publicId);
      logger.success(`Image deleted via beacon: ${publicId}`);
      res.json({ message: "Image berhasil dihapus" });
    } catch (error) {
      logger.error("Delete image via beacon error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

module.exports = router;
