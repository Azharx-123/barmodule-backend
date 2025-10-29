const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

// Middleware untuk autentikasi
const authMiddleware = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        message: "Akses ditolak - Token tidak ditemukan",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");

    req.user = decoded;
    logger.info(`User authenticated: ${decoded.userId}`);
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
  ownershipMiddleware,
};
