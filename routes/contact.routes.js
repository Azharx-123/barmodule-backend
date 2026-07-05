const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const { validateContact } = require("../middleware/validateRequest");
const logger = require("../utils/logger");

// Submit contact (Public)
router.post("/", validateContact, async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();

    logger.success(`New contact message from: ${req.body.email}`);
    res.status(201).json({ message: "Pesan berhasil dikirim" });
  } catch (error) {
    logger.error("Submit contact error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all contacts (Admin only)
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    const contacts = await Contact.find(query).sort("-createdAt");
    res.json(contacts);
  } catch (error) {
    logger.error("Get contacts error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Update contact status (Admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "read", "replied"].includes(status)) {
      return res.status(400).json({
        message: "Status tidak valid",
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        message: "Contact tidak ditemukan",
      });
    }

    logger.success(`Contact status updated: ${contact._id}`);
    res.json({ message: "Status berhasil diupdate", contact });
  } catch (error) {
    logger.error("Update contact error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
