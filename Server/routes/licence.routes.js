const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
  createKey,
  listKey,
  deleteKey,
  activateKey,
  getDashboardStats,
  resetKey,
  updateKey
} = require("../controllers/licence.controller");

// All licence routes are protected (admin only)
// router.post("/licence", protect, createKey);
// router.get("/licences", protect, listKey);
// router.delete("/licence/:id", protect, deleteKey);
// router.post("/licences/activate", activateKey);
// router.get("/licences/stats", protect, getDashboardStats);

router.post("/licences/create", protect, createKey);
router.get("/licences/list", protect, listKey);
router.delete("/licences/delete/:id", protect, deleteKey);
router.post("/licences/activate", activateKey);
router.get("/licences/stats", protect, getDashboardStats);
router.post("/licences/resetkey", protect, resetKey);
router.post('/licences/update/:id', protect, updateKey)

module.exports = router;
