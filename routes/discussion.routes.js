const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");
const logger = require("../utils/logger");

// Helper: cek apakah user berhak akses diskusi course ini (admin selalu boleh, user lain harus enrolled)
const canAccessDiscussion = async (reqUser, courseId) => {
  if (["admin", "teacher"].includes(reqUser.role)) return true;
  const user = await User.findById(reqUser.userId).select("enrolledCourses");
  return !!user?.enrolledCourses?.some(
    (ec) => ec.courseId.toString() === courseId,
  );
};

// Get riwayat diskusi untuk 1 course (Authenticated + enrolled/admin)
// Kirim pesan baru & hapus pesan dilakukan realtime lewat Socket.io (lihat socket/discussionSocket.js),
// route ini cuma dipakai sekali saat tab "Forum Diskusi" pertama kali dibuka untuk load histori.
router.get("/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;

    const allowed = await canAccessDiscussion(req.user, courseId);
    if (!allowed) {
      return res
        .status(403)
        .json({ message: "Kamu belum mengikuti course ini" });
    }

    const messages = await Message.find({ courseId })
      .populate("userId", "name avatar role")
      .sort("createdAt")
      .limit(200);

    res.json(messages);
  } catch (error) {
    logger.error("Get discussion error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
