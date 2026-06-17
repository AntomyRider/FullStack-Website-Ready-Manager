const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const axios = require("axios");

const GITHUB_USERNAME = "AntomyRider";
const REPO_NAME = "ReadyManager"; // Public repo — no token needed

/**
 * Fetches the latest release info directly from GitHub public API.
 * No authentication required since the repo is public.
 */
async function getDownloadInfo() {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "DiscordBot-ReadyManager",
  };

  const res = await axios.get(
    `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/releases`,
    { headers }
  );

  const releases = res.data;
  if (!releases || releases.length === 0) {
    return null;
  }

  const latest = releases[0];
  const exeAsset =
    latest.assets.find((a) => a.name.toLowerCase().endsWith(".exe")) ||
    latest.assets[0];

  return {
    version: latest.tag_name,
    name: latest.name,
    notes: latest.body || "",
    publishedAt: latest.published_at,
    fileName: exeAsset ? exeAsset.name : null,
    // browser_download_url is publicly accessible on a public repo ✅
    downloadUrl: exeAsset ? exeAsset.browser_download_url : latest.html_url,
    htmlUrl: latest.html_url,
  };
}

module.exports = { getDownloadInfo };
