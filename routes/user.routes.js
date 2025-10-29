const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");
const logger = require("../utils/logger");

// Get user profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password -__v")
      .populate("enrolledCourses.courseId", "title slug image category");

    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    res.json(user);
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Enroll course
router.post("/enroll", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        message: "Course ID diperlukan",
      });
    }

    const user = await User.findById(req.user.userId);

    const alreadyEnrolled = user.enrolledCourses.some(
      (course) => course.courseId.toString() === courseId
    );

    if (alreadyEnrolled) {
      return res.status(400).json({
        message: "Sudah terdaftar di course ini",
      });
    }

    user.enrolledCourses.push({ courseId });
    await user.save();

    logger.success(`User ${user.email} enrolled in course ${courseId}`);
    res.json({ message: "Berhasil mendaftar course" });
  } catch (error) {
    logger.error("Enroll course error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Update progress
router.put("/progress/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { progress } = req.body;

    const user = await User.findById(req.user.userId);
    const courseIndex = user.enrolledCourses.findIndex(
      (c) => c.courseId.toString() === courseId
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        message: "Belum terdaftar di course ini",
      });
    }

    user.enrolledCourses[courseIndex].progress = progress;
    await user.save();

    res.json({ message: "Progress berhasil diupdate" });
  } catch (error) {
    logger.error("Update progress error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
