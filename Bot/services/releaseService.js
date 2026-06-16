const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const axios = require("axios");

async function getLatestRelease() {
  const GITHUB_USERNAME = "AntomyRider";
  const REPO_NAME = "Project-Automation";
  const TOKEN = process.env.TOKEN_GIT; // in case there's a TOKEN_GIT in the bot's environment

  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "DiscordBot-ReadyManager",
  };
  if (TOKEN) {
    headers["Authorization"] = `token ${TOKEN}`;
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/releases`,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error("getLatestRelease error:", error.message);
    throw error;
  }
}

async function getDownloadInfo() {
  const releases = await getLatestRelease();
  if (!releases || releases.length === 0) {
    return null;
  }
  const latest = releases[0];
  // Find an asset ending with .exe
  const exeAsset = latest.assets.find(asset => asset.name.toLowerCase().endsWith('.exe'));
  // Or fallback to the first asset if no .exe found
  const downloadAsset = exeAsset || latest.assets[0];

  return {
    version: latest.tag_name,
    name: latest.name,
    notes: latest.body || "",
    publishedAt: latest.published_at,
    downloadUrl: downloadAsset ? downloadAsset.browser_download_url : null,
    fileName: downloadAsset ? downloadAsset.name : null,
    htmlUrl: latest.html_url
  };
}

module.exports = {
  getLatestRelease,
  getDownloadInfo,
};
