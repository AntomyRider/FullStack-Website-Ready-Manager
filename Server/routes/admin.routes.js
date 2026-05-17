const express = require("express");
const { login, me } = require("../controllers/admin.controller");
const router = express.Router();

router.post("/auth/login", login);
router.get("/auth/me", me);

module.exports = router;
