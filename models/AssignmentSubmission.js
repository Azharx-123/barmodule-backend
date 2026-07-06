const mongoose = require("mongoose");

const submissionFileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    fileName: String,
    mimetype: String,
    resourceType: { type: String, enum: ["image", "raw"], required: true },
    fileSize: Number,
  },
  { _id: false },
);

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assignment",
    required: true,
  },
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
  files: [submissionFileSchema],
  isLate: { type: Boolean, default: false },
  score: { type: Number, min: 0, max: 100, default: null },
  feedback: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now },
  gradedAt: Date,
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// 1 siswa hanya boleh punya 1 submission per tugas.
// Resubmit = update dokumen yang sama (upsert), bukan insert baru.
assignmentSubmissionSchema.index(
  { assignmentId: 1, userId: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  "AssignmentSubmission",
  assignmentSubmissionSchema,
);