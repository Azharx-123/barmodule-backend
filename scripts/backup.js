const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const User = require("../models/User");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const QuizResult = require("../models/QuizResult");
const Contact = require("../models/Contact");

const backupDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database...");

    const backupDir = path.join(__dirname, "../backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    const data = {
      users: await User.find({}),
      courses: await Course.find({}),
      quizzes: await Quiz.find({}),
      quizResults: await QuizResult.find({}),
      contacts: await Contact.find({}),
    };

    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    console.log(`Backup created: ${backupFile}`);

    mongoose.connection.close();
  } catch (error) {
    console.error("Backup failed:", error);
    process.exit(1);
  }
};

backupDatabase();
