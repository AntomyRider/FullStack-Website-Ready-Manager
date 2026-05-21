const express = require("express");
const { verify } = require("../controllers/auth.controller");
const router = express.Router();

// Verify is public (used by client apps)
router.post("/licenses/verify", verify);

module.exports = router;
