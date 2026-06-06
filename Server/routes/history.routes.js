const express = require("express");
const { getHistory } = require("../controllers/history.controller");
const { protect } = require("../middleware/auth.middleware");
const router = express.Router();

router.get("/history/get", protect, getHistory);

module.exports = router;
