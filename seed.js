const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import Models
const User = require("./models/User");
const Course = require("./models/Course");
const Quiz = require("./models/Quiz");

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/barmodule",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seed...");

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});
    await Quiz.deleteMany({});
    console.log("✅ Cleared existing data");

    // Create Admin User
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await User.create({
      name: "Admin Barmodule",
      email: "admin@barmodule.com",
      password: adminPassword,
      role: "admin",
    });
    console.log("✅ Created admin user");

    // Create Test Users
    const userPassword = await bcrypt.hash("user123", 10);
    const user1 = await User.create({
      name: "Siti Aminah",
      email: "siti@example.com",
      password: userPassword,
      role: "user",
    });

    const user2 = await User.create({
      name: "Budi Santoso",
      email: "budi@example.com",
      password: userPassword,
      role: "user",
    });
    console.log("✅ Created test users");

    // Create Courses
    const courses = [
      {
        title: "Pemangkasan Rambut Teknik Uniform Layer",
        slug: "belajar-hairstyle",
        description:
          "Kelas ini menyajikan pengetahuan komprehensif tentang teknik pemangkasan rambut Uniform Layer",
        category: "hairstyle",
        image: "/assets/images/Class Hairstyle.png",
        videoUrl: "https://www.youtube.com/watch?v=mHQFy8IZPLY",
        content: {
          ringkasan:
            "Program komprehensif pemangkasan rambut Uniform Layer dari dasar hingga mahir.",
          tujuan: [
            "Memahami konsep dasar teknik Uniform Layer",
            "Mengidentifikasi tujuan dan manfaat pemangkasan",
            "Mengenali komponen-komponen penting",
            "Melaksanakan prosedur dengan benar",
          ],
          durasi: "8 jam atau 2 hari",
          target: [
            "Mahasiswa tata rias",
            "Penata rambut pemula",
            "Profesional",
          ],
        },
      },
      {
        title: "Teknik Dasar Perawatan Salon",
        slug: "belajar-salon",
        description:
          "Pelajari teknik dasar perawatan salon profesional dari nol",
        category: "salon",
        image: "/assets/images/Class Salon.png",
        videoUrl: "https://www.youtube.com/watch?v=mHQFy8IZPLY",
        content: {
          ringkasan:
            "Teknik dasar perawatan salon yang profesional dan komprehensif.",
          tujuan: [
            "Menguasai teknik perawatan dasar",
            "Memahami standar pelayanan salon",
            "Menggunakan peralatan dengan benar",
          ],
          durasi: "6 jam atau 2 hari",
          target: ["Pemula", "Praktisi salon"],
        },
      },
      {
        title: "Perawatan Rambut Treatment Intensif",
        slug: "belajar-treatment",
        description: "Teknik treatment untuk rambut sehat dan berkilau",
        category: "treatment",
        image: "/assets/images/Class Treatment.png",
        videoUrl: "https://www.youtube.com/watch?v=mHQFy8IZPLY",
        content: {
          ringkasan: "Program treatment intensif untuk berbagai jenis rambut.",
          tujuan: [
            "Menguasai teknik treatment profesional",
            "Memahami jenis-jenis treatment",
            "Melakukan diagnosa rambut",
          ],
          durasi: "8 jam",
          target: ["Hair stylist", "Beauty therapist"],
        },
      },
      {
        title: "Teknik Dasar Tata Rias Wajah",
        slug: "belajar-tatarias",
        description: "Pelajari teknik tata rias wajah dari dasar hingga mahir",
        category: "tatarias",
        image: "/assets/images/Class Tatarias.png",
        videoUrl: "https://www.youtube.com/watch?v=mHQFy8IZPLY",
        content: {
          ringkasan: "Teknik tata rias wajah dasar untuk berbagai acara.",
          tujuan: [
            "Menguasai teknik makeup dasar",
            "Memahami color theory",
            "Mengaplikasikan makeup sesuai bentuk wajah",
          ],
          durasi: "10 jam atau 3 hari",
          target: ["Makeup artist pemula", "Beauty enthusiast"],
        },
      },
    ];

    const createdCourses = await Course.insertMany(courses);
    console.log("✅ Created courses");

    // Create Quiz for Hairstyle Course
    const hairstyleCourse = createdCourses.find(
      (c) => c.slug === "belajar-hairstyle"
    );
    await Quiz.create({
      courseId: hairstyleCourse._id,
      multipleChoice: [
        {
          question:
            "Tindakan mengurangi panjang rambut semula dengan teknik tertentu adalah definisi dari...",
          options: [
            "Pemangkasan",
            "Pewarnaan",
            "Pengeritingan",
            "Pelurusan",
            "Styling",
          ],
          answer: 0,
        },
        {
          question: "Sudut pemangkasan uniform layer adalah...",
          options: ["45°", "60°", "90°", "120°", "180°"],
          answer: 2,
        },
        {
          question: "Alat utama yang digunakan untuk pemangkasan adalah...",
          options: ["Sisir", "Gunting", "Hairdryer", "Cape", "Handuk"],
          answer: 1,
        },
      ],
      essay: [
        {
          question:
            "Jelaskan langkah-langkah dalam melakukan pemangkasan teknik uniform layer!",
          keyWords: [
            "basahi rambut",
            "bagi rambut",
            "sudut 90 derajat",
            "potong merata",
            "periksa hasil",
          ],
        },
        {
          question: "Apa perbedaan antara texturizing dan blunt cutting?",
          keyWords: [
            "tekstur",
            "ujung rambut",
            "volume",
            "garis lurus",
            "ketebalan",
          ],
        },
      ],
    });
    console.log("✅ Created quiz for Hairstyle course");

    // Create Quiz for Salon Course
    const salonCourse = createdCourses.find((c) => c.slug === "belajar-salon");
    await Quiz.create({
      courseId: salonCourse._id,
      multipleChoice: [
        {
          question:
            "Tindakan profesional untuk merawat dan mempercantik penampilan di salon disebut...",
          options: [
            "Perawatan salon",
            "Kosmetologi",
            "Terapi kecantikan",
            "Spa",
            "Beauty care",
          ],
          answer: 0,
        },
        {
          question: "Petugas salon yang menangani perawatan rambut disebut...",
          options: [
            "Hairdresser",
            "Beautician",
            "Therapist",
            "Stylist",
            "Konsultan",
          ],
          answer: 0,
        },
      ],
      essay: [
        {
          question:
            "Jelaskan langkah-langkah konsultasi awal dengan klien salon!",
          keyWords: [
            "sapa klien",
            "tanya kebutuhan",
            "analisis kondisi",
            "rekomendasikan perawatan",
          ],
        },
      ],
    });
    console.log("✅ Created quiz for Salon course");

    // Enroll users in courses
    user1.enrolledCourses.push({ courseId: hairstyleCourse._id });
    user1.enrolledCourses.push({ courseId: salonCourse._id });
    await user1.save();

    user2.enrolledCourses.push({ courseId: hairstyleCourse._id });
    await user2.save();
    console.log("✅ Enrolled users in courses");

    console.log("\n✨ Database seeded successfully!");
    console.log("\n📝 Test Credentials:");
    console.log("Admin: admin@barmodule.com / admin123");
    console.log("User 1: siti@example.com / user123");
    console.log("User 2: budi@example.com / user123");
    console.log("\n");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Run seed
seedDatabase();
