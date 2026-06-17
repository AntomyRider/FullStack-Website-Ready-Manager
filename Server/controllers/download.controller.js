const axios = require("axios");

const GITHUB_USERNAME = "AntomyRider";
const REPO_NAME = "Project-Automation";

/**
 * GET /api/download/latest
 * Returns a temporary S3 redirect URL for the latest .exe release asset.
 * Accessible by Bot (BOT_SECRET) only — not exposed to public.
 */
async function getLatestDownloadUrl(req, res) {
  const TOKEN = process.env.TOKEN_GIT;

  if (!TOKEN) {
    return res.status(500).json({
      success: false,
      message: "GitHub token not configured on server.",
    });
  }

  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${TOKEN}`,
    "User-Agent": "DiscordBot-ReadyManager",
  };

  try {
    // 1. Fetch releases list
    const releasesRes = await axios.get(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/releases`,
      { headers }
    );

    const releases = releasesRes.data;
    if (!releases || releases.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No releases found.",
      });
    }

    const latest = releases[0];

    // 2. Find .exe asset
    const exeAsset =
      latest.assets.find((a) => a.name.toLowerCase().endsWith(".exe")) ||
      latest.assets[0];

    if (!exeAsset) {
      return res.status(404).json({
        success: false,
        message: "No downloadable asset found in the latest release.",
      });
    }

    // 3. Call GitHub asset API with Accept: application/octet-stream
    //    GitHub will respond with a 302 redirect to a temporary AWS S3 URL
    const assetRes = await axios.get(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/releases/assets/${exeAsset.id}`,
      {
        headers: {
          ...headers,
          Accept: "application/octet-stream",
        },
        maxRedirects: 0,        // ไม่ follow redirect — เราต้องการแค่ URL
        validateStatus: (s) => s === 302 || s === 200,
      }
    );

    // The temporary S3 URL is in the Location header of the 302 response
    const tempUrl = assetRes.headers["location"] || exeAsset.browser_download_url;

    return res.json({
      success: true,
      version: latest.tag_name,
      name: latest.name,
      fileName: exeAsset.name,
      publishedAt: latest.published_at,
      notes: latest.body || "",
      downloadUrl: tempUrl,
    });
  } catch (err) {
    console.error("[Download Controller] Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch download info from GitHub.",
    });
  }
}

module.exports = { getLatestDownloadUrl };
