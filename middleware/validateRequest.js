const validateCourse = (req, res, next) => {
  const { title, slug } = req.body;

  if (!title || title.trim() === "") {
    return res.status(400).json({ message: "Title is required" });
  }

  if (!slug || slug.trim() === "") {
    return res.status(400).json({ message: "Slug is required" });
  }

  next();
};

const validateContact = (req, res, next) => {
  const { name, email, title, message } = req.body;

  if (!name || !email || !title || !message) {
    return res.status(400).json({
      message: "Name, email, title, and message are required",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  next();
};

module.exports = { validateCourse, validateContact };
