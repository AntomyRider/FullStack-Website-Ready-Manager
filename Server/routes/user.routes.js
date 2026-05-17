const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { getUserById } = require("../controllers/user.controller");
const router = express.Router();

// Protected route (admin only)
router.get("/user/:key", getUserById);

module.exports = router;
