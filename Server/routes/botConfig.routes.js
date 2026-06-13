const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { getBotConfig, updateBotConfig } = require("../controllers/botConfig.controller");

// Middleware to allow either admin (via protect) or the Bot (via BOT_SECRET)
const allowAdminOrBot = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${process.env.BOT_SECRET || "READY_MANAGER_BOT_SECRET_2026"}`) {
    return next();
  }
  // If not bot, run standard protect middleware
  return protect(req, res, next);
};

router.get("/bot-config", allowAdminOrBot, getBotConfig);
router.put("/bot-config", protect, updateBotConfig); // only admin can update config

module.exports = router;
