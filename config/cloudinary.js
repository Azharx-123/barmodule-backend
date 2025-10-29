const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage untuk avatar users
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "barmodule/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  },
});

// Storage untuk course images
const courseStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "barmodule/courses",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
  },
});

// Storage untuk material images
const materialStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "barmodule/materials",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// Multer upload configs
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadCourse = multer({
  storage: courseStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadMaterial = multer({
  storage: materialStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = {
  cloudinary,
  uploadAvatar,
  uploadCourse,
  uploadMaterial,
};
