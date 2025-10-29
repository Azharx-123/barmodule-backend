const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  category: {
    type: String,
    enum: ["hairstyle", "salon", "treatment", "tatarias"],
  },
  image: String,
  videoUrl: String,
  content: {
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
