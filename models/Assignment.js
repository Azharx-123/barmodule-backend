const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  title: { type: String, required: true },
  instruksi: { type: String, required: true }, // HTML dari ReactQuill
  deadline: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

assignmentSchema.index({ courseId: 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
