const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  email: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "read", "replied"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Contact", contactSchema);
