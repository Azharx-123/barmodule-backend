const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Query riwayat chat per course diurutkan berdasarkan waktu — index ini yang paling sering dipakai
messageSchema.index({ courseId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
