const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const initDiscussionSocket = require("./socket/discussionSocket");

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Connect to database
connectDB();

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const courseRoutes = require("./routes/course.routes");
const quizRoutes = require("./routes/quiz.routes");
const contactRoutes = require("./routes/contact.routes");
const adminRoutes = require("./routes/admin.routes");
const uploadRoutes = require("./routes/upload.routes");
const discussionRoutes = require("./routes/discussion.routes");

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/discussion", discussionRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler (must be last)
app.use(errorHandler);

// Bungkus app dengan HTTP server manual — Socket.io butuh ini supaya bisa nempel
// di server yang sama dengan Express (satu port, satu proses)
const server = http.createServer(app);

// Setup Socket.io untuk fitur Forum Diskusi realtime
const io = new Server(server, {
  cors: {
    origin: "*", // sesuaikan/batasi ke URL frontend production kalau perlu
  },
});
initDiscussionSocket(io);

// Start server — pakai server.listen (bukan app.listen) supaya Socket.io ikut aktif
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.success(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
