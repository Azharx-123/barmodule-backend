const express = require("express");
const router = express.Router();
const Quiz = require("../models/Quiz");
const QuizResult = require("../models/QuizResult");
const { authMiddleware, teacherMiddleware } = require("../middleware/auth");
const {
  collectQuizImageUrls,
  deleteCloudinaryImages,
} = require("../config/cloudinary");
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

    const result = await QuizResult.findOneAndUpdate(
      { userId: req.user.userId, quizId, courseId },
      { mcAnswers, essayAnswers, score, submittedAt: Date.now() },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

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

// Get hasil quiz milik user untuk 1 course (Authenticated)
// dipakai CoursePage supaya jawaban & skor tetap "nempel" saat reload
router.get("/result/:courseId", authMiddleware, async (req, res) => {
  try {
    const result = await QuizResult.findOne({
      userId: req.user.userId,
      courseId: req.params.courseId,
    }).sort("-submittedAt");

    if (!result) {
      return res.status(404).json({ message: "Belum ada hasil quiz" });
    }

    res.json(result);
  } catch (error) {
    logger.error("Get quiz result error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Hapus hasil quiz milik user untuk 1 course (Authenticated) — dipakai tombol Reset
router.delete("/result/:courseId", authMiddleware, async (req, res) => {
  try {
    await QuizResult.deleteMany({
      userId: req.user.userId,
      courseId: req.params.courseId,
    });
    res.json({ message: "Hasil quiz berhasil direset" });
  } catch (error) {
    logger.error("Delete quiz result error:", error);
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

// Create/Update quiz
router.post("/", authMiddleware, teacherMiddleware, async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID diperlukan" });
    }

    const existingQuiz = await Quiz.findOne({ courseId });

    if (existingQuiz) {
      const oldImageUrls = collectQuizImageUrls(existingQuiz);

      const quiz = await Quiz.findOneAndUpdate({ courseId }, req.body, {
        new: true,
        runValidators: true,
      });

      // Bersihkan gambar soal lama yang sudah diganti/dihapus admin
      const newImageUrls = collectQuizImageUrls(quiz);
      const orphanedUrls = oldImageUrls.filter(
        (url) => !newImageUrls.includes(url),
      );

      let cleanupNote = "";
      if (orphanedUrls.length > 0) {
        try {
          const { deletedCount, attempted } =
            await deleteCloudinaryImages(orphanedUrls);
          cleanupNote = ` — ${deletedCount}/${attempted} gambar soal lama dibersihkan`;
        } catch (cloudinaryError) {
          logger.error(
            "Cloudinary cleanup error saat update quiz:",
            cloudinaryError.message,
          );
        }
      }

      logger.success(`Quiz updated for course: ${courseId}${cleanupNote}`);
      return res.json({ message: "Quiz berhasil diupdate", quiz });
    }

    const quiz = new Quiz(req.body);
    await quiz.save();
    logger.success(`Quiz created for course: ${courseId}`);
    res.status(201).json({ message: "Quiz berhasil dibuat", quiz });
  } catch (error) {
    logger.error("Create/Update quiz error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
