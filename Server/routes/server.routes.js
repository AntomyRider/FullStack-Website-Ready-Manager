const express = require("express");
const { verify } = require("../controllers/auth.controller");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");

const {
  getServerStats,
  getHealth,
  getLogs,
  getProcesses,
  getConnections,
} = require("../controllers/server.controller");

router.get("/server/stats", protect, getServerStats); // CPU, RAM, Disk, Network
router.get("/server/health", protect, getHealth); // overall ok/warning/critical
router.get("/server/logs", protect, getLogs); // ?lines=100&level=error&search=xxx
router.get("/server/processes", protect, getProcesses); // PM2 + top ps
router.get("/server/connections", protect, getConnections); // active TCP connections

module.exports = router;