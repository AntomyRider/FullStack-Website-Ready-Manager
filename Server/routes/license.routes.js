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
  resetHwid,
  redeemKey
} = require("../controllers/license.controller");

router.post("/licenses/create", protect, createKey);
router.get("/licenses/list", protect, listKey);
router.delete("/licenses/delete/:id", protect, deleteKey);
router.post("/licenses/activate", activateKey);
router.get("/licenses/stats", protect, getDashboardStats);
router.post("/licenses/resetkey", protect, resetKey);
router.post('/licenses/update/:id', protect, updateKey)
router.delete('/licenses/delete', protect, deleteAllKeys)
router.post('/licenses/claim', claimKey)
router.post('/licenses/reset-hwid', resetHwid)
router.post('/licenses/redeem', redeemKey)
module.exports = router;
