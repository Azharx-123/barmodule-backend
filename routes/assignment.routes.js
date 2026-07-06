const express = require("express");
const router = express.Router();
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const User = require("../models/User");
const { authMiddleware, teacherMiddleware } = require("../middleware/auth");
const {
  uploadAssignment,
  getResourceType,
  deleteCloudinaryFiles,
} = require("../config/cloudinary");
const logger = require("../utils/logger");

// Bungkus multer supaya error (tipe file salah / lebih dari 2MB) dibalas
// dengan pesan yang jelas, bukan error mentah dari multer.
const handleAssignmentUpload = (req, res, next) => {
  uploadAssignment.array("files", 5)(req, res, (err) => {
    if (err) {
      logger.error("Assignment upload error:", err.message);
      return res.status(400).json({
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "Ukuran file maksimal 2MB per file"
            : err.message || "Gagal upload file",
      });
    }
    next();
  });
};

const isStudentEnrolledInCourse = async (userId, courseId) => {
  const user = await User.findById(userId);
  return !!user?.enrolledCourses?.some(
    (ec) => ec.courseId?.toString() === courseId.toString(),
  );
};

// ─────────────────────────────────────────────────────────────────────────
// GET semua tugas untuk 1 course
// - Teacher/Admin: list tugas + jumlah submission per tugas
// - Student: list tugas + status submission miliknya sendiri (kalau ada)
// ─────────────────────────────────────────────────────────────────────────
router.get("/course/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const assignments = await Assignment.find({ courseId }).sort("-createdAt");

    if (["admin", "teacher"].includes(req.user.role)) {
      const assignmentIds = assignments.map((a) => a._id);
      const counts = await AssignmentSubmission.aggregate([
        { $match: { assignmentId: { $in: assignmentIds } } },
        { $group: { _id: "$assignmentId", count: { $sum: 1 } } },
      ]);
      const countMap = counts.reduce((acc, c) => {
        acc[c._id.toString()] = c.count;
        return acc;
      }, {});

      return res.json(
        assignments.map((a) => ({
          ...a.toObject(),
          submissionCount: countMap[a._id.toString()] || 0,
        })),
      );
    }

    // Student: wajib terdaftar di course ini
    const enrolled = await isStudentEnrolledInCourse(req.user.userId, courseId);
    if (!enrolled) {
      return res
        .status(403)
        .json({ message: "Anda belum terdaftar di course ini" });
    }

    const submissions = await AssignmentSubmission.find({
      courseId,
      userId: req.user.userId,
    });
    const submissionMap = submissions.reduce((acc, s) => {
      acc[s.assignmentId.toString()] = s;
      return acc;
    }, {});

    res.json(
      assignments.map((a) => ({
        ...a.toObject(),
        mySubmission: submissionMap[a._id.toString()] || null,
      })),
    );
  } catch (error) {
    logger.error("Get assignments error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// CREATE tugas (Teacher only)
// ─────────────────────────────────────────────────────────────────────────
router.post("/", authMiddleware, teacherMiddleware, async (req, res) => {
  try {
    const { courseId, title, instruksi, deadline } = req.body;
    if (!courseId || !title || !instruksi || !deadline) {
      return res.status(400).json({
        message: "courseId, title, instruksi, dan deadline wajib diisi",
      });
    }

    const assignment = new Assignment({ courseId, title, instruksi, deadline });
    await assignment.save();

    logger.success(`Assignment created: ${assignment.title}`);
    res.status(201).json({ message: "Tugas berhasil dibuat", assignment });
  } catch (error) {
    logger.error("Create assignment error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// UPDATE tugas (Teacher only)
// ─────────────────────────────────────────────────────────────────────────
router.put("/:id", authMiddleware, teacherMiddleware, async (req, res) => {
  try {
    const { title, instruksi, deadline } = req.body;
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { title, instruksi, deadline, updatedAt: Date.now() },
      { new: true, runValidators: true },
    );
    if (!assignment) {
      return res.status(404).json({ message: "Tugas tidak ditemukan" });
    }

    logger.success(`Assignment updated: ${assignment.title}`);
    res.json({ message: "Tugas berhasil diupdate", assignment });
  } catch (error) {
    logger.error("Update assignment error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// DELETE tugas (Teacher only) — cascade hapus semua submission & file Cloudinary
// ─────────────────────────────────────────────────────────────────────────
router.delete("/:id", authMiddleware, teacherMiddleware, async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: "Tugas tidak ditemukan" });
    }

    const submissions = await AssignmentSubmission.find({
      assignmentId: assignment._id,
    });
    const allFiles = submissions.flatMap((s) => s.files);

    let deletedFileCount = 0;
    if (allFiles.length > 0) {
      try {
        const result = await deleteCloudinaryFiles(allFiles);
        deletedFileCount = result.deletedCount;
      } catch (cloudinaryError) {
        logger.error(
          "Cloudinary cleanup error saat delete assignment:",
          cloudinaryError.message,
        );
      }
    }

    const deletedSubmissions = await AssignmentSubmission.deleteMany({
      assignmentId: assignment._id,
    });

    logger.success(
      `Assignment deleted: ${assignment.title} — cascade: ${deletedSubmissions.deletedCount} submission, ${deletedFileCount}/${allFiles.length} file Cloudinary dihapus`,
    );

    res.json({
      message: "Tugas, seluruh submission, dan file terkait berhasil dihapus",
    });
  } catch (error) {
    logger.error("Delete assignment error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// SUBMIT jawaban tugas (Student) — mendukung resubmit (replace file lama)
// ─────────────────────────────────────────────────────────────────────────
router.post(
  "/:id/submit",
  authMiddleware,
  handleAssignmentUpload,
  async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Tugas tidak ditemukan" });
      }

      if (req.user.role !== "student") {
        return res
          .status(403)
          .json({ message: "Hanya siswa yang dapat mengumpulkan tugas" });
      }

      const enrolled = await isStudentEnrolledInCourse(
        req.user.userId,
        assignment.courseId,
      );
      if (!enrolled) {
        return res
          .status(403)
          .json({ message: "Anda belum terdaftar di course ini" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "Harap upload minimal 1 file" });
      }

      const newFiles = req.files.map((file) => ({
        url: file.path,
        publicId: file.filename,
        fileName: file.originalname,
        mimetype: file.mimetype,
        resourceType: getResourceType(file.mimetype),
        fileSize: file.size,
      }));

      const isLate = Date.now() > new Date(assignment.deadline).getTime();

      const existing = await AssignmentSubmission.findOne({
        assignmentId: assignment._id,
        userId: req.user.userId,
      });

      // Resubmit: hapus file lama dari Cloudinary dulu supaya tidak jadi sampah
      if (existing && existing.files.length > 0) {
        try {
          await deleteCloudinaryFiles(existing.files);
        } catch (cloudinaryError) {
          logger.error(
            "Cloudinary cleanup error saat resubmit:",
            cloudinaryError.message,
          );
        }
      }

      const submission = await AssignmentSubmission.findOneAndUpdate(
        { assignmentId: assignment._id, userId: req.user.userId },
        {
          courseId: assignment.courseId,
          files: newFiles,
          isLate,
          submittedAt: Date.now(),
          // Reset penilaian tiap kali submit ulang — guru perlu menilai ulang
          score: null,
          feedback: "",
          gradedAt: null,
          gradedBy: null,
        },
        { new: true, upsert: true, runValidators: true },
      );

      logger.success(
        `Assignment submitted: ${req.user.userId} → ${assignment.title}${isLate ? " (terlambat)" : ""}`,
      );
      res.json({
        message: isLate
          ? "Tugas berhasil dikumpulkan (terlambat)"
          : "Tugas berhasil dikumpulkan",
        submission,
      });
    } catch (error) {
      logger.error("Submit assignment error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// GET semua submission untuk 1 tugas (Teacher only)
// ─────────────────────────────────────────────────────────────────────────
router.get(
  "/:id/submissions",
  authMiddleware,
  teacherMiddleware,
  async (req, res) => {
    try {
      const submissions = await AssignmentSubmission.find({
        assignmentId: req.params.id,
      })
        .populate("userId", "name email avatar")
        .sort("-submittedAt");

      res.json(submissions);
    } catch (error) {
      logger.error("Get submissions error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// BERI NILAI submission (Teacher only)
// ─────────────────────────────────────────────────────────────────────────
router.put(
  "/submissions/:submissionId/grade",
  authMiddleware,
  teacherMiddleware,
  async (req, res) => {
    try {
      const { score, feedback } = req.body;

      if (score === undefined || score === null || score === "") {
        return res.status(400).json({ message: "Skor wajib diisi" });
      }
      const numericScore = Number(score);
      if (
        Number.isNaN(numericScore) ||
        numericScore < 0 ||
        numericScore > 100
      ) {
        return res.status(400).json({ message: "Skor harus di antara 0-100" });
      }

      const submission = await AssignmentSubmission.findByIdAndUpdate(
        req.params.submissionId,
        {
          score: numericScore,
          feedback: feedback || "",
          gradedAt: Date.now(),
          gradedBy: req.user.userId,
        },
        { new: true, runValidators: true },
      );

      if (!submission) {
        return res.status(404).json({ message: "Submission tidak ditemukan" });
      }

      logger.success(`Assignment graded: ${submission._id} → ${numericScore}`);
      res.json({ message: "Nilai berhasil disimpan", submission });
    } catch (error) {
      logger.error("Grade assignment error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

module.exports = router;
