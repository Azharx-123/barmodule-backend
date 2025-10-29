const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const { validateCourse } = require("../middleware/validateRequest");
const logger = require("../utils/logger");

// Get all courses (Public)
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(query).select("-__v").sort("-createdAt");

    res.json(courses);
  } catch (error) {
    logger.error("Get courses error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get course by slug (Public)
router.get("/:slug", async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });

    if (!course) {
      return res.status(404).json({
        message: "Course tidak ditemukan",
      });
    }

    res.json(course);
  } catch (error) {
    logger.error("Get course error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create course (Admin only)
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  validateCourse,
  async (req, res) => {
    try {
      const course = new Course(req.body);
      await course.save();

      logger.success(`Course created: ${course.title}`);
      res.status(201).json({
        message: "Course berhasil dibuat",
        course,
      });
    } catch (error) {
      logger.error("Create course error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Update course (Admin only)
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validateCourse,
  async (req, res) => {
    try {
      const course = await Course.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!course) {
        return res.status(404).json({
          message: "Course tidak ditemukan",
        });
      }

      logger.success(`Course updated: ${course.title}`);
      res.json({ message: "Course berhasil diupdate", course });
    } catch (error) {
      logger.error("Update course error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete course (Admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course tidak ditemukan",
      });
    }

    logger.success(`Course deleted: ${course.title}`);
    res.json({ message: "Course berhasil dihapus" });
  } catch (error) {
    logger.error("Delete course error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
