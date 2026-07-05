const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const User = require("../models/User");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const QuizResult = require("../models/QuizResult");
const Contact = require("../models/Contact");

const restoreDatabase = async (backupFile) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database...");

    if (!fs.existsSync(backupFile)) {
      console.error("Backup file not found:", backupFile);
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(backupFile, "utf8"));

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});
    await Quiz.deleteMany({});
    await QuizResult.deleteMany({});
    await Contact.deleteMany({});

    // Restore data
    if (data.users) await User.insertMany(data.users);
    if (data.courses) await Course.insertMany(data.courses);
    if (data.quizzes) await Quiz.insertMany(data.quizzes);
    if (data.quizResults) await QuizResult.insertMany(data.quizResults);
    if (data.contacts) await Contact.insertMany(data.contacts);

    console.log("Database restored successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error("Restore failed:", error);
    process.exit(1);
  }
};

// Get backup file from command line argument
const backupFile = process.argv[2];
if (!backupFile) {
  console.error("Usage: node restore.js <backup-file-path>");
  process.exit(1);
}

restoreDatabase(backupFile);
