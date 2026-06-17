const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const axios = require("axios");

/**
 * Fetches the latest release download info via the internal Server API.
 * The Server handles GitHub authentication — Bot never needs TOKEN_GIT.
 */
async function getDownloadInfo() {
  const API_URL = process.env.API_URL || "http://localhost:3000/api";
  const BOT_SECRET = process.env.BOT_SECRET || "READY_MANAGER_BOT_SECRET_2026";

  // Fix URL when running on Windows outside Docker
  const baseUrl = API_URL.includes("://server:") && process.platform === "win32"
    ? API_URL.replace("://server:", "://localhost:")
    : API_URL;

  const res = await axios.get(`${baseUrl}/download/latest`, {
    headers: {
      Authorization: `Bearer ${BOT_SECRET}`,
    },
  });

  if (!res.data.success) {
    throw new Error(res.data.message || "Failed to get download info");
  }

  return res.data;
}

module.exports = { getDownloadInfo };
