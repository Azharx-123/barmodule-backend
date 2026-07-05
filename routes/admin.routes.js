const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const QuizResult = require("../models/QuizResult");
const Contact = require("../models/Contact");
const {
  authMiddleware,
  adminMiddleware,
  teacherMiddleware,
  staffMiddleware,
} = require("../middleware/auth");
const {
  collectQuizImageUrls,
  deleteCloudinaryImages,
} = require("../config/cloudinary");
const logger = require("../utils/logger");

// Get dashboard stats (Admin & Teacher — teacher tidak dapat pendingContacts)
router.get("/stats", authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    const [totalUsers, totalCourses, totalQuizzes, pendingContacts] =
      await Promise.all([
        User.countDocuments(),
        Course.countDocuments(),
        QuizResult.countDocuments(),
        isAdmin
          ? Contact.countDocuments({ status: "pending" })
          : Promise.resolve(undefined),
      ]);

    res.json({
      totalUsers,
      totalCourses,
      totalQuizzes,
      ...(isAdmin && { pendingContacts }),
    });
  } catch (error) {
    logger.error("Get admin stats error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all users (Admin & Teacher)
router.get("/users", authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("enrolledCourses.courseId", "title slug")
      .sort("-createdAt");
    res.json(users);
  } catch (error) {
    logger.error("Get users error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Delete user (Admin: siswa & teacher | Teacher: siswa saja)
router.delete(
  "/users/:id",
  authMiddleware,
  staffMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }
      if (user.role === "admin") {
        return res
          .status(403)
          .json({ message: "Tidak bisa menghapus akun admin" });
      }
      if (user.role === "teacher" && req.user.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Guru tidak bisa menghapus sesama guru" });
      }
      await User.findByIdAndDelete(req.params.id);
      logger.success(`User deleted: ${user.email}`);
      res.json({ message: "User berhasil dihapus" });
    } catch (error) {
      logger.error("Delete user error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// Keluarkan / pindahkan siswa dari course (Admin & Teacher) — sekaligus hapus jejak hasil quiz di course lama
router.put(
  "/users/:id/enrollment",
  authMiddleware,
  staffMiddleware,
  async (req, res) => {
    try {
      const { courseId } = req.body; // null/undefined = keluarkan dari course

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }
      if (["admin", "teacher"].includes(user.role)) {
        return res.status(400).json({
          message: "Admin/Teacher tidak memerlukan pengaturan enrollment",
        });
      }

      const oldCourseIds = user.enrolledCourses.map((ec) =>
        ec.courseId?.toString(),
      );

      // Guard: tidak ada perubahan nyata — jangan hapus jejak/reset progress percuma
      if (courseId && oldCourseIds.includes(courseId.toString())) {
        return res.json({
          message:
            "Siswa memang sudah terdaftar di course tersebut, tidak ada perubahan",
        });
      }
      if (!courseId && oldCourseIds.length === 0) {
        return res.json({
          message: "Siswa memang belum mengikuti course apa pun",
        });
      }

      let newCourse = null;
      if (courseId) {
        newCourse = await Course.findById(courseId);
        if (!newCourse) {
          return res
            .status(404)
            .json({ message: "Course tujuan tidak ditemukan" });
        }
      }

      // Hapus jejak hasil quiz siswa ini di course lama
      if (oldCourseIds.length > 0) {
        await QuizResult.deleteMany({
          userId: user._id,
          courseId: { $in: oldCourseIds },
        });
      }

      user.enrolledCourses = newCourse
        ? [{ courseId: newCourse._id, enrolledAt: Date.now(), progress: 0 }]
        : [];
      await user.save();

      logger.success(
        `Enrollment updated for ${user.email}: ${
          newCourse ? newCourse.title : "keluar dari course"
        }`,
      );

      res.json({
        message: newCourse
          ? `Siswa dipindahkan ke course: ${newCourse.title}`
          : "Siswa berhasil dikeluarkan dari course",
      });
    } catch (error) {
      logger.error("Update enrollment error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// Ubah role user antara siswa <-> teacher (Admin only)
router.put(
  "/users/:id/role",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { role } = req.body;

      if (!["student", "teacher"].includes(role)) {
        return res.status(400).json({
          message: "Role tidak valid — hanya bisa 'siswa' atau 'teacher'",
        });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      if (user.role === "admin") {
        return res.status(403).json({
          message: "Tidak bisa mengubah role admin",
        });
      }

      if (user.role === role) {
        return res.json({
          message: `User memang sudah berrole ${role}, tidak ada perubahan`,
        });
      }

      // Promosi siswa -> teacher: bersihkan enrollment & hasil quiz, karena teacher tidak butuh
      if (role === "teacher" && user.enrolledCourses.length > 0) {
        const oldCourseIds = user.enrolledCourses.map((ec) =>
          ec.courseId?.toString(),
        );
        await QuizResult.deleteMany({
          userId: user._id,
          courseId: { $in: oldCourseIds },
        });
        user.enrolledCourses = [];
      }

      user.role = role;
      await user.save();

      logger.success(`Role updated for ${user.email}: ${role}`);
      res.json({ message: `Role berhasil diubah menjadi ${role}` });
    } catch (error) {
      logger.error("Update role error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// Get all quiz results (Teacher only)
router.get(
  "/quiz-results",
  authMiddleware,
  teacherMiddleware,
  async (req, res) => {
    try {
      const results = await QuizResult.find()
        .populate("userId", "name email")
        .populate("courseId", "title slug")
        .sort("-submittedAt");
      res.json(results);
    } catch (error) {
      logger.error("Get quiz results error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// Delete quiz beserta seluruh hasilnya (Teacher only)
router.delete(
  "/quizzes/:id",
  authMiddleware,
  teacherMiddleware,
  async (req, res) => {
    try {
      const quiz = await Quiz.findByIdAndDelete(req.params.id);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz tidak ditemukan" });
      }
      await QuizResult.deleteMany({ quizId: req.params.id });

      const imageUrls = collectQuizImageUrls(quiz);
      let deletedImageCount = 0;
      if (imageUrls.length > 0) {
        try {
          const result = await deleteCloudinaryImages(imageUrls);
          deletedImageCount = result.deletedCount;
        } catch (cloudinaryError) {
          logger.error(
            "Cloudinary cleanup error saat delete quiz:",
            cloudinaryError.message,
          );
        }
      }

      logger.success(
        `Quiz deleted: ${req.params.id} — ${deletedImageCount}/${imageUrls.length} gambar Cloudinary dihapus`,
      );
      res.json({ message: "Quiz dan hasilnya berhasil dihapus" });
    } catch (error) {
      logger.error("Delete quiz error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// Delete contact message (Admin only)
router.delete(
  "/contacts/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const contact = await Contact.findByIdAndDelete(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact tidak ditemukan" });
      }
      res.json({ message: "Contact berhasil dihapus" });
    } catch (error) {
      logger.error("Delete contact error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

module.exports = router;
