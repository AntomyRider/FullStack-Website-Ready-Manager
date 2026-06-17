const axios = require("axios");

const GITHUB_USERNAME = "AntomyRider";
const REPO_NAME = "Project-Automation";

/** Shared helper: fetch latest .exe asset info from GitHub */
async function fetchLatestAsset() {
  const TOKEN = process.env.TOKEN_GIT;
  if (!TOKEN) throw new Error("GitHub token not configured on server.");

  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${TOKEN}`,
    "User-Agent": "DiscordBot-ReadyManager",
  };

  const releasesRes = await axios.get(
    `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/releases`,
    { headers }
  );

  const releases = releasesRes.data;
  if (!releases || releases.length === 0) throw new Error("No releases found.");

  const latest = releases[0];
  const exeAsset =
    latest.assets.find((a) => a.name.toLowerCase().endsWith(".exe")) ||
    latest.assets[0];

  if (!exeAsset) throw new Error("No downloadable asset in the latest release.");

  return { latest, exeAsset, headers };
}

/**
 * GET /api/download/latest
 * Returns release metadata + a short redirect URL for the Bot to pass to Discord.
 * Accessible by Bot (BOT_SECRET) only.
 */
async function getLatestDownloadUrl(req, res) {
  try {
    const { latest, exeAsset } = await fetchLatestAsset();

    // Build a short redirect URL — the server itself will handle the actual redirect
    // This URL is always short enough for Discord's 512-char button limit
    const host = process.env.CLIENT_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
    const redirectUrl = `${host}/api/download/redirect`;

    return res.json({
      success: true,
      version: latest.tag_name,
      name: latest.name,
      fileName: exeAsset.name,
      publishedAt: latest.published_at,
      notes: latest.body || "",
      downloadUrl: redirectUrl,   // short URL — safe for Discord buttons
    });
  } catch (err) {
    console.error("[Download Controller] getLatestDownloadUrl error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch download info from GitHub.",
    });
  }
}

/**
 * GET /api/download/redirect  (PUBLIC)
 * Fetches a fresh temporary S3 URL from GitHub and 302-redirects the user's browser.
 * The user's browser downloads the file directly from AWS S3 — no bandwidth cost to server.
 */
async function redirectToDownload(req, res) {
  try {
    const { exeAsset, headers } = await fetchLatestAsset();

    // Ask GitHub for the asset with octet-stream — it responds with 302 → temp S3 URL
    const assetRes = await axios.get(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/releases/assets/${exeAsset.id}`,
      {
        headers: { ...headers, Accept: "application/octet-stream" },
        maxRedirects: 0,                              // capture the redirect, don't follow
        validateStatus: (s) => s === 302 || s === 200,
      }
    );

    const s3Url = assetRes.headers["location"];

    if (!s3Url) {
      // Fallback: let browser handle the authenticated github URL (may 404 for private)
      console.warn("[Download Redirect] No S3 location header, falling back to browser_download_url");
      return res.redirect(302, exeAsset.browser_download_url);
    }

    console.log(`[Download Redirect] → ${exeAsset.name} (${exeAsset.size} bytes)`);
    return res.redirect(302, s3Url);

  } catch (err) {
    console.error("[Download Controller] redirectToDownload error:", err.message);
    return res.status(500).send("ไม่สามารถดาวน์โหลดได้ในขณะนี้ โปรดลองอีกครั้งภายหลัง");
  }
}

module.exports = { getLatestDownloadUrl, redirectToDownload };
