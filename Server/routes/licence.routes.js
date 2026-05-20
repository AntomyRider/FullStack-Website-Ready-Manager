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
  updateKey,
  deleteAllKeys,
  claimKey,
  resetHwid
} = require("../controllers/licence.controller");

router.post("/licences/create", protect, createKey);
router.get("/licences/list", protect, listKey);
router.delete("/licences/delete/:id", protect, deleteKey);
router.post("/licences/activate", activateKey);
router.get("/licences/stats", protect, getDashboardStats);
router.post("/licences/resetkey", protect, resetKey);
router.post('/licences/update/:id', protect, updateKey)
router.delete('/licences/delete', protect, deleteAllKeys)
router.post('/licences/claim', claimKey)
router.post('/licences/reset-hwid', resetHwid)


module.exports = router;
