const express = require("express");
const router = express.Router();
const { getLatestDownloadUrl } = require("../controllers/download.controller");

// Middleware: allow Bot via BOT_SECRET only (not exposed to browser clients)
const allowBotOnly = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const BOT_SECRET = process.env.BOT_SECRET || "READY_MANAGER_BOT_SECRET_2026";
  if (authHeader === `Bearer ${BOT_SECRET}`) {
    return next();
  }
  return res.status(403).json({ success: false, message: "Forbidden." });
};

// GET /api/download/latest — Bot calls this to get a temporary download link
router.get("/download/latest", allowBotOnly, getLatestDownloadUrl);

module.exports = router;
