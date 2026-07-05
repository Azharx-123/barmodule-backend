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

// Storage untuk gambar deskripsi kelas (content course)
const courseContentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "barmodule/course-content",
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

const uploadCourseContent = multer({
  storage: courseContentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadMaterial = multer({
  storage: materialStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Ekstrak semua URL gambar dari struktur course: root, materials, sections, tools
const collectCourseImageUrls = (course) => {
  const urls = [];
  if (!course) return urls;
  if (course.image) urls.push(course.image);
  if (course.content?.image) urls.push(course.content.image);
  (course.materials || []).forEach((mat) => {
    if (mat.image) urls.push(mat.image);
    (mat.sections || []).forEach((sec) => {
      if (sec.image) urls.push(sec.image);
    });
  });
  (course.tools || []).forEach((tool) => {
    (tool.categories || []).forEach((cat) => {
      (cat.items || []).forEach((item) => {
        if (item.image) urls.push(item.image);
      });
    });
  });
  return urls;
};

// Ekstrak semua URL gambar dari struktur quiz: soal pilihan ganda & essay
const collectQuizImageUrls = (quiz) => {
  const urls = [];
  if (!quiz) return urls;
  (quiz.multipleChoice || []).forEach((q) => {
    if (q.image) urls.push(q.image);
  });
  (quiz.essay || []).forEach((q) => {
    if (q.image) urls.push(q.image);
  });
  return urls;
};

// Hapus banyak gambar Cloudinary sekaligus berdasarkan URL.
// Dedup otomatis, batch 100 per panggilan (limit Cloudinary API).
const deleteCloudinaryImages = async (urls) => {
  const publicIds = [
    ...new Set((urls || []).map(extractPublicId).filter(Boolean)),
  ];
  if (publicIds.length === 0) return { deletedCount: 0, attempted: 0 };

  let deletedCount = 0;
  for (let i = 0; i < publicIds.length; i += 100) {
    const batch = publicIds.slice(i, i + 100);
    const result = await cloudinary.api.delete_resources(batch);
    deletedCount += Object.values(result.deleted || {}).filter(
      (status) => status === "deleted",
    ).length;
  }
  return { deletedCount, attempted: publicIds.length };
};

// Ekstrak public_id dari URL Cloudinary, mendukung folder bersarang (misal "barmodule/avatars/xxx")
const extractPublicId = (url) => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary")) {
    return null;
  }
  const uploadMarker = "/upload/";
  const idx = url.indexOf(uploadMarker);
  if (idx === -1) return null;

  let path = url.substring(idx + uploadMarker.length);
  path = path.replace(/^v\d+\//, ""); // buang segmen versi, misal "v1719800000/"
  path = path.replace(/\.[a-zA-Z0-9]+$/, ""); // buang ekstensi file

  return path || null;
};

module.exports = {
  cloudinary,
  uploadAvatar,
  uploadCourse,
  uploadCourseContent,
  uploadMaterial,
  extractPublicId,
  collectCourseImageUrls,
  collectQuizImageUrls,
  deleteCloudinaryImages,
};