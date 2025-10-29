const validateCourse = (req, res, next) => {
  const { title, slug, category } = req.body;

  if (!title || title.trim() === "") {
    return res.status(400).json({ message: "Title is required" });
  }

  if (!slug || slug.trim() === "") {
    return res.status(400).json({ message: "Slug is required" });
  }

  const validCategories = ["hairstyle", "salon", "treatment", "tatarias"];
  if (category && !validCategories.includes(category)) {
    return res.status(400).json({
      message:
        "Invalid category. Must be one of: " + validCategories.join(", "),
    });
  }

  next();
};

const validateContact = (req, res, next) => {
  const { email, title, message } = req.body;

  if (!email || !title || !message) {
    return res.status(400).json({
      message: "Email, title, and message are required",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  next();
};

module.exports = { validateCourse, validateContact };
