const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  image: String,
  videoUrl: String,
  searchKeywords: [String],

  // ─── Course Summary (tab atas: Pengenalan, Kebutuhan, Video) ──────────────
  summary: {
    // Tab "Pengenalan" → array sub-section, misal:
    // [{ title: "Dibuat untuk", items: ["..."] }, { title: "Kompetensi Dasar", items: ["..."] }]
    pengenalan: [
      {
        title: String,
        items: [String],
      },
    ],
    // Tab "Apa yang dibutuhkan" → plain list of strings (tanpa icon)
    kebutuhan: [String],
    // Tab "Video" di Course Summary (video pengenalan singkat)
    videos: [
      {
        title: String,
        url: String,
      },
    ],
  },

  // ─── Class Course: Deskripsi Kelas ───────────────────────────────────────
  content: {
    image: String,
    ringkasan: String,
    tujuan: [String],
    materi: [
      {
        title: String,
        items: [String],
      },
    ],
    metode: [String],
    durasi: String,
    target: [String],
    evaluasi: [String],
    sertifikasi: String,
  },

  // ─── Class Course: Materi (deskripsi + sections) ─────────────────────────
  materials: [
    {
      title: String,
      image: String,
      description: String,
      sections: [
        {
          subTitle: String,
          image: String,
          description: String,
        },
      ],
    },
  ],

  // ─── Class Course: Video Materi (berseksi, terpisah dari summary.videos) ─
  videos: [
    {
      sectionTitle: String,
      videos: [
        {
          title: String,
          url: String,
        },
      ],
    },
  ],

  // ─── Class Course: Persiapan Kerja / Tools ───────────────────────────────
  tools: [
    {
      title: String,
      description: String,
      categories: [
        {
          title: String,
          description: String,
          items: [
            {
              subtitle: String,
              image: String,
              description: String,
            },
          ],
        },
      ],
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Course", courseSchema);
