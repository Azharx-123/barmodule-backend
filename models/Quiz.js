const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  multipleChoice: [
    {
      question: { type: String, required: true },
      image: String,
      options: [String],
      answer: { type: Number, required: true },
    },
  ],
  essay: [
    {
      question: { type: String, required: true },
      image: String,
      keyWords: [String],
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Quiz", quizSchema);
