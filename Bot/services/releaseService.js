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
  // TinyURL/is.gd reject raw IP URLs — convert to nip.io domain first
  // e.g. http://157.254.192.134/... → http://157.254.192.134.nip.io/...
  const urlToShorten = info.downloadUrl.replace(
    /^(https?):\/\/(\d+\.\d+\.\d+\.\d+)/,
    (_, proto, ip) => `${proto}://${ip}.nip.io`
  );

  info.downloadUrl = await shortenUrl(urlToShorten);

  return info;
}

// Cache the short URL so we only call TinyURL once per bot session
let cachedShortUrl = null;

/**
 * Converts a long URL to a short link.
 * Tries is.gd first, then TinyURL as fallback.
 * Falls back to the original URL if both fail.
 */
async function shortenUrl(longUrl) {
  if (cachedShortUrl) return cachedShortUrl;

  // --- Attempt 1: is.gd ---
  try {
    const res = await axios.get("https://is.gd/create.php", {
      params: { format: "simple", url: longUrl },
      timeout: 6000,
    });
    if (res.data && res.data.startsWith("http")) {
      cachedShortUrl = res.data.trim();
      console.log(`[ReleaseService] Short URL (is.gd): ${cachedShortUrl}`);
      return cachedShortUrl;
    }
  } catch (err) {
    console.warn("[ReleaseService] is.gd failed:", err.message);
  }

  // --- Attempt 2: TinyURL ---
  try {
    const res = await axios.get("https://tinyurl.com/api-create.php", {
      params: { url: longUrl },
      timeout: 6000,
    });
    if (res.data && res.data.startsWith("http")) {
      cachedShortUrl = res.data.trim();
      console.log(`[ReleaseService] Short URL (TinyURL): ${cachedShortUrl}`);
      return cachedShortUrl;
    }
  } catch (err) {
    console.warn("[ReleaseService] TinyURL failed:", err.message);
  }

  console.warn("[ReleaseService] All shorteners failed — using original URL");
  return longUrl;
}

module.exports = { getDownloadInfo };
