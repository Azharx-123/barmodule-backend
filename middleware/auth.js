const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const User = require("../models/User");

// Middleware untuk autentikasi
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token)
      return res
        .status(401)
        .json({ message: "Akses ditolak - Token tidak ditemukan" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");

    // ⬅️ tambahan: pastikan user masih ada
    const userExists = await User.exists({ _id: decoded.userId });
    if (!userExists) {
      return res.status(401).json({ message: "Akun sudah tidak ada" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error("Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    res.status(400).json({ message: "Token tidak valid" });
  }
};

// Middleware untuk admin
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    logger.warn(`Admin access denied for user: ${req.user.userId}`);
    return res.status(403).json({
      message: "Akses ditolak - Admin only",
    });
  }
  next();
};

const teacherMiddleware = (req, res, next) => {
  if (req.user.role !== "teacher") {
    logger.warn(`Teacher access denied for user: ${req.user.userId}`);
    return res.status(403).json({ message: "Akses ditolak - Teacher only" });
  }
  next();
};

const staffMiddleware = (req, res, next) => {
  if (!["admin", "teacher"].includes(req.user.role)) {
    return res.status(403).json({ message: "Akses ditolak" });
  }
  next();
};

// Middleware untuk cek ownership
const ownershipMiddleware = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Skip for admin
      if (req.user.role === "admin") {
        return next();
      }

      // Check ownership based on resource type
      // Implementation depends on your needs
      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  teacherMiddleware,
  staffMiddleware,
  ownershipMiddleware,
};
