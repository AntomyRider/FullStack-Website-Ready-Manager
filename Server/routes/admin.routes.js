const express = require("express");
const { register, login, me } = require("../controllers/admin.controller");
const { protect } = require("../middleware/auth.middleware");
const router = express.Router();

router.post("/auth/login", login);

// Protected route
router.get("/auth/me", protect, me);

module.exports = router;
