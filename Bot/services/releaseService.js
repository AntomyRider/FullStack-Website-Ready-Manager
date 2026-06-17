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

  const info = res.data;

  // Shorten the redirect URL via TinyURL so customers don't see the server IP
  info.downloadUrl = await shortenUrl(info.downloadUrl);

  return info;
}

// Cache the short URL so we only call TinyURL once per bot session
let cachedShortUrl = null;

/**
 * Converts a long URL to a TinyURL short link.
 * Falls back to the original URL if TinyURL is unavailable.
 */
async function shortenUrl(longUrl) {
  if (cachedShortUrl) return cachedShortUrl;

  try {
    const res = await axios.get("https://tinyurl.com/api-create.php", {
      params: { url: longUrl },
      timeout: 5000,
    });

    if (res.data && res.data.startsWith("http")) {
      cachedShortUrl = res.data.trim();
      console.log(`[ReleaseService] Short URL created: ${cachedShortUrl}`);
      return cachedShortUrl;
    }
  } catch (err) {
    console.warn("[ReleaseService] TinyURL failed, using original URL:", err.message);
  }

  // Fallback: return the original URL (still works, just shows IP)
  return longUrl;
}

module.exports = { getDownloadInfo };
