const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");

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

// ─── Storage untuk file tugas (assignment submissions) ─────────────────────
// Campuran gambar & dokumen (pdf/docx/zip/ppt/xls). resource_type ditentukan
// per-file berdasarkan mimetype: gambar → "image", selain itu → "raw".
// Cloudinary WAJIB tahu resource_type yang benar saat upload, terutama untuk
// dokumen non-gambar (raw), makanya params berupa fungsi, bukan objek statis.
const getResourceType = (mimetype) =>
  mimetype?.startsWith("image/") ? "image" : "raw";

const ALLOWED_ASSIGNMENT_FORMATS = [
  "pdf",
  "doc",
  "docx",
  "zip",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
];

const ALLOWED_ASSIGNMENT_MIMETYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
];

const assignmentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname); // ".pdf", ".docx", dst
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_"); // spasi/karakter aneh → underscore

    return {
      folder: "barmodule/assignments",
      resource_type: getResourceType(file.mimetype),
      public_id: `${baseName}-${Date.now()}${ext}`,
      allowed_formats: ALLOWED_ASSIGNMENT_FORMATS,
    };
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

// Maksimal 2MB per file, sesuai requirement. fileFilter menolak tipe file
// yang tidak diizinkan sebelum sempat diupload ke Cloudinary.
const uploadAssignment = multer({
  storage: assignmentStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per file
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_ASSIGNMENT_MIMETYPES.includes(file.mimetype)) {
      return cb(
        new Error(
          "Tipe file tidak didukung. Gunakan PDF, Word, Excel, PowerPoint, ZIP, atau gambar (JPG/PNG).",
        ),
      );
    }
    cb(null, true);
  },
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

// Hapus banyak FILE TUGAS (gambar & dokumen) dari Cloudinary sekaligus.
// Beda dengan deleteCloudinaryImages: menerima {publicId, resourceType}
// langsung (bukan ekstrak dari URL), karena public_id untuk resource_type
// "raw" tidak selalu aman diturunkan dari URL, dan tiap resource_type harus
// dihapus dengan grup panggilan API terpisah.
const deleteCloudinaryFiles = async (files) => {
  const validFiles = (files || []).filter((f) => f?.publicId);
  if (validFiles.length === 0) return { deletedCount: 0, attempted: 0 };

  const grouped = validFiles.reduce((acc, f) => {
    const type = f.resourceType === "raw" ? "raw" : "image";
    if (!acc[type]) acc[type] = new Set();
    acc[type].add(f.publicId);
    return acc;
  }, {});

  let deletedCount = 0;
  let attempted = 0;

  for (const [resourceType, idSet] of Object.entries(grouped)) {
    const ids = [...idSet];
    attempted += ids.length;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const result = await cloudinary.api.delete_resources(batch, {
        resource_type: resourceType,
      });
      deletedCount += Object.values(result.deleted || {}).filter(
        (status) => status === "deleted",
      ).length;
    }
  }

  return { deletedCount, attempted };
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
  uploadAssignment,
  getResourceType,
  extractPublicId,
  collectCourseImageUrls,
  collectQuizImageUrls,
  deleteCloudinaryImages,
  deleteCloudinaryFiles,
};
