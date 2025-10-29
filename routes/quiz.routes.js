const express = require("express");
const router = express.Router();
const Quiz = require("../models/Quiz");
const QuizResult = require("../models/QuizResult");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const logger = require("../utils/logger");

// Get quiz by course (Public/Authenticated)
router.get("/course/:courseId", async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      courseId: req.params.courseId,
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz tidak ditemukan",
      });
    }

    res.json(quiz);
  } catch (error) {
    logger.error("Get quiz error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Submit quiz (Authenticated)
router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const { quizId, courseId, mcAnswers, essayAnswers, score } = req.body;

    if (!quizId || !courseId || score === undefined) {
      return res.status(400).json({
        message: "Data quiz tidak lengkap",
      });
    }

    const result = new QuizResult({
      userId: req.user.userId,
      quizId,
      courseId,
      mcAnswers,
      essayAnswers,
      score,
    });

    await result.save();

    logger.success(`Quiz submitted by user: ${req.user.userId}`);
    res.status(201).json({
      message: "Quiz berhasil disubmit",
      result,
    });
  } catch (error) {
    logger.error("Submit quiz error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get user quiz results (Authenticated)
router.get("/results", authMiddleware, async (req, res) => {
  try {
    const results = await QuizResult.find({
      userId: req.user.userId,
    })
      .populate("courseId", "title slug")
      .sort("-submittedAt");

    res.json(results);
  } catch (error) {
    logger.error("Get quiz results error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create/Update quiz (Admin only)
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        message: "Course ID diperlukan",
      });
    }

    let quiz = await Quiz.findOne({ courseId });

    if (quiz) {
      quiz = await Quiz.findOneAndUpdate({ courseId }, req.body, { new: true });
      logger.success(`Quiz updated for course: ${courseId}`);
      res.json({ message: "Quiz berhasil diupdate", quiz });
    } else {
      quiz = new Quiz(req.body);
      await quiz.save();
      logger.success(`Quiz created for course: ${courseId}`);
      res.status(201).json({ message: "Quiz berhasil dibuat", quiz });
    }
  } catch (error) {
    logger.error("Create/Update quiz error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
