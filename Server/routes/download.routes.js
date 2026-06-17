const express = require("express");
const router = express.Router();
const { getLatestDownloadUrl, redirectToDownload } = require("../controllers/download.controller");

// Middleware: Bot only (via BOT_SECRET header)
const allowBotOnly = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const BOT_SECRET = process.env.BOT_SECRET || "READY_MANAGER_BOT_SECRET_2026";
  if (authHeader === `Bearer ${BOT_SECRET}`) {
    return next();
  }
  return res.status(403).json({ success: false, message: "Forbidden." });
};

// GET /api/download/latest  — Bot calls this to get release info + short redirect URL
router.get("/download/latest", allowBotOnly, getLatestDownloadUrl);

// GET /api/download/redirect — PUBLIC: user's browser hits this, server redirects to S3
router.get("/download/redirect", redirectToDownload);

module.exports = router;
