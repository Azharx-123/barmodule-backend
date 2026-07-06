const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const User = require("../models/User");
const logger = require("../utils/logger");

// Setup namespace default untuk fitur Forum Diskusi (chat per course, realtime)
const initDiscussionSocket = (io) => {
  // Autentikasi koneksi socket pakai JWT yang sama dengan REST API (lihat middleware/auth.js)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Token tidak ditemukan"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
      socket.user = decoded; // { userId, role, ... } — sama persis seperti req.user di REST
      next();
    } catch (error) {
      next(new Error("Token tidak valid"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(
      `Discussion socket connected: ${socket.id} (user: ${socket.user.userId})`,
    );

    // Client join room diskusi untuk 1 course — sekaligus jadi gerbang otorisasi.
    // Admin dan guru selalu boleh join; user lain harus enrolled di course tsb.
    socket.on("join-course", async (courseId) => {
      try {
        if (!courseId) return;

        let allowed = ["admin", "teacher"].includes(socket.user.role);
        if (!allowed) {
          const user = await User.findById(socket.user.userId).select(
            "enrolledCourses",
          );
          allowed = !!user?.enrolledCourses?.some(
            (ec) => ec.courseId.toString() === courseId,
          );
        }

        if (!allowed) {
          socket.emit("discussion-error", "Kamu belum mengikuti course ini");
          return;
        }

        socket.join(`course-${courseId}`);
        socket.discussionCourseId = courseId;
      } catch (error) {
        logger.error("join-course error:", error.message);
        socket.emit("discussion-error", "Gagal bergabung ke diskusi");
      }
    });

    socket.on("leave-course", (courseId) => {
      if (courseId) socket.leave(`course-${courseId}`);
      if (socket.discussionCourseId === courseId) {
        socket.discussionCourseId = null;
      }
    });

    // Kirim pesan baru — hanya boleh kalau sudah berhasil join-course untuk course yang sama.
    // Ini mencegah user kirim pesan ke course yang belum diverifikasi otorisasinya.
    socket.on("send-message", async ({ courseId, message }) => {
      try {
        if (!courseId || courseId !== socket.discussionCourseId) {
          socket.emit(
            "discussion-error",
            "Kamu belum bergabung ke diskusi course ini",
          );
          return;
        }

        const trimmed = (message || "").trim().slice(0, 1000);
        if (!trimmed) return;

        const newMessage = await Message.create({
          courseId,
          userId: socket.user.userId,
          message: trimmed,
        });

        await newMessage.populate("userId", "name avatar role");

        io.to(`course-${courseId}`).emit("new-message", newMessage);
      } catch (error) {
        logger.error("send-message error:", error.message);
        socket.emit("discussion-error", "Gagal mengirim pesan");
      }
    });

    // Hapus pesan — admin dan guru
    socket.on("delete-message", async ({ messageId }) => {
      try {
       if (!["admin", "teacher"].includes(socket.user.role)) {
         socket.emit("discussion-error", "Akses ditolak - Admin only");
         return;
       }
        const deleted = await Message.findByIdAndDelete(messageId);
        if (!deleted) return;

        io.to(`course-${deleted.courseId}`).emit("message-deleted", {
          messageId,
        });
        logger.info(
          `Message ${messageId} deleted by ${socket.user.role} ${socket.user.userId}`,
        );
      } catch (error) {
        logger.error("delete-message error:", error.message);
        socket.emit("discussion-error", "Gagal menghapus pesan");
      }
    });

    socket.on("disconnect", () => {
      logger.info(`Discussion socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initDiscussionSocket;
