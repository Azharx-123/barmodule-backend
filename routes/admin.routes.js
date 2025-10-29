const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/Course");
const QuizResult = require("../models/QuizResult");
const Contact = require("../models/Contact");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const logger = require("../utils/logger");

// Get dashboard stats
router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [totalUsers, totalCourses, totalQuizzes, pendingContacts] =
      await Promise.all([
        User.countDocuments(),
        Course.countDocuments(),
        QuizResult.countDocuments(),
        Contact.countDocuments({ status: "pending" }),
      ]);

    res.json({
      totalUsers,
      totalCourses,
      totalQuizzes,
      pendingContacts,
    });
  } catch (error) {
    logger.error("Get admin stats error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
