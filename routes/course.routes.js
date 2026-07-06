const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const User = require("../models/User"); // ⬅️ baru
const Quiz = require("../models/Quiz");           // ⬅️ baru
const QuizResult = require("../models/QuizResult"); // ⬅️ baru
const { authMiddleware, teacherMiddleware } = require("../middleware/auth");
const { validateCourse } = require("../middleware/validateRequest");
const {
  collectCourseImageUrls,
  collectQuizImageUrls,
  deleteCloudinaryImages,
} = require("../config/cloudinary");
const logger = require("../utils/logger");

// Get all courses (Public)
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(query).select("-__v").sort("createdAt");

    res.json(courses);
  } catch (error) {
    logger.error("Get courses error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get course by slug (Protected + cek enrollment untuk student)
router.get("/:slug", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });

    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    // Admin punya akses penuh ke semua course
    if (["admin", "teacher"].includes(req.user.role)) {
      return res.json(course);
    }

    // Siswa: cek apakah dia terdaftar di course ini
    const user = await User.findById(req.user.userId);
    const isEnrolled = user?.enrolledCourses?.some(
      (ec) => ec.courseId?.toString() === course._id.toString(),
    );

    if (!isEnrolled) {
      // Balikin data minimal saja untuk preview + tombol join,
      // bukan seluruh konten course
      return res.status(403).json({
        message: "Anda belum terdaftar di course ini",
        code: "NOT_ENROLLED",
        course: {
          _id: course._id,
          title: course.title,
          slug: course.slug,
          description: course.description,
          image: course.image,
        },
      });
    }

    res.json(course);
  } catch (error) {
    logger.error("Get course error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Enroll ke course (siswa, self-service). Aturan: 1 siswa = 1 course.
router.post("/:id/enroll", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    if (["admin", "teacher"].includes(req.user.role)) {
      return res.status(400).json({
        message: "Admin sudah memiliki akses penuh ke semua course",
      });
    }

    const user = await User.findById(req.user.userId);

    const alreadyHere = user.enrolledCourses.some(
      (ec) => ec.courseId?.toString() === course._id.toString(),
    );
    if (alreadyHere) {
      return res.json({ message: "Anda sudah terdaftar di course ini", course });
    }

    if (user.enrolledCourses.length > 0) {
      return res.status(403).json({
        message: "Anda sudah terdaftar di course lain. Hubungi admin untuk pindah course.",
        code: "ALREADY_ENROLLED_ELSEWHERE",
      });
    }

    user.enrolledCourses.push({
      courseId: course._id,
      enrolledAt: Date.now(),
      progress: 0,
    });
    await user.save();

    logger.success(`User ${user.email} enrolled to course: ${course.title}`);
    res.json({ message: "Berhasil mengikuti course", course });
  } catch (error) {
    logger.error("Enroll error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create course (Admin only)
router.post(
  "/",
  authMiddleware,
  teacherMiddleware,
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
  },
);

// Update course (Admin only)
router.put(
  "/:id",
  authMiddleware,
  teacherMiddleware,
  validateCourse,
  async (req, res) => {
    try {
      const existingCourse = await Course.findById(req.params.id);
      if (!existingCourse) {
        return res.status(404).json({ message: "Course tidak ditemukan" });
      }

      const oldImageUrls = collectCourseImageUrls(existingCourse);

      const course = await Course.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true },
      );

      // Bersihkan gambar lama yang sudah diganti/dihapus admin (upload baru atau URL diubah manual)
      const newImageUrls = collectCourseImageUrls(course);
      const orphanedUrls = oldImageUrls.filter(
        (url) => !newImageUrls.includes(url),
      );

      let cleanupNote = "";
      if (orphanedUrls.length > 0) {
        try {
          const { deletedCount, attempted } =
            await deleteCloudinaryImages(orphanedUrls);
          cleanupNote = ` — ${deletedCount}/${attempted} gambar lama dibersihkan dari Cloudinary`;
        } catch (cloudinaryError) {
          logger.error(
            "Cloudinary cleanup error saat update course:",
            cloudinaryError.message,
          );
        }
      }

      logger.success(`Course updated: ${course.title}${cleanupNote}`);
      res.json({ message: "Course berhasil diupdate", course });
    } catch (error) {
      logger.error("Update course error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// Delete course (Admin only) — cascade: hapus quiz, hasil quiz, keluarkan siswa, hapus gambar Cloudinary
router.delete("/:id", authMiddleware, teacherMiddleware, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    const quizzes = await Quiz.find({ courseId: course._id });

    const imageUrls = [
      ...collectCourseImageUrls(course),
      ...quizzes.flatMap((quiz) => collectQuizImageUrls(quiz)),
    ];

    const [deletedQuiz, quizResultCleanup, userCleanup] = await Promise.all([
      Quiz.deleteMany({ courseId: course._id }),
      QuizResult.deleteMany({ courseId: course._id }),
      User.updateMany(
        { "enrolledCourses.courseId": course._id },
        { $pull: { enrolledCourses: { courseId: course._id } } },
      ),
    ]);

    let deletedImageCount = 0;
    if (imageUrls.length > 0) {
      try {
        const result = await deleteCloudinaryImages(imageUrls);
        deletedImageCount = result.deletedCount;
      } catch (cloudinaryError) {
        logger.error(
          "Cloudinary cleanup error saat delete course:",
          cloudinaryError.message,
        );
      }
    }

    logger.success(
      `Course deleted: ${course.title} — cascade: ${deletedQuiz.deletedCount} quiz, ${quizResultCleanup.deletedCount} hasil quiz, ${userCleanup.modifiedCount} siswa dikeluarkan, ${deletedImageCount}/${imageUrls.length} gambar Cloudinary dihapus`,
    );

    res.json({
      message:
        "Course, quiz terkait, seluruh hasil quiz, enrollment siswa, dan gambar terkait berhasil dihapus",
    });
  } catch (error) {
    logger.error("Delete course error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
