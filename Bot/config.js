const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

let apiUrl = process.env.API_URL || "http://localhost:3000/api";

// Fallback to localhost when running on Windows (non-Docker environment)
if (apiUrl.includes("://server:") && process.platform === "win32") {
  apiUrl = apiUrl.replace("://server:", "://localhost:");
}

module.exports = {
  TOKEN: process.env.TOKEN,
  API_URL: apiUrl,
  ROLE_ID: process.env.ROLE_ID,
  VERIFY_CHANNEL_ID: "1506243441007398964",
  SLIP_CHANNEL_ID: process.env.SLIP_CHANNEL_ID || "1511988318743695381", // Channel for bank transfer slips
  EMBED_IMAGE_URL:
    "https://img2.pic.in.th/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f776174747061642d6d656469612d736572766963652f53746f7279496d6167652f412d77586c7a2d354458414c76413d3d2d313134363638353832352e3136623139303963393361393730.gif",
  ADMIN_PHONE: process.env.ADMIN_PHONE || "0832584267",
  BOT_SECRET: process.env.BOT_SECRET || "READY_MANAGER_BOT_SECRET_2026",
  ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID || "1505624921529909398",
  BANK_NAME: process.env.BANK_NAME || "กรุงไทย",
  BANK_HOLDER: process.env.BANK_HOLDER || "นครินทร์ งานยางหวาย",
  BANK_ACCOUNT: process.env.BANK_ACCOUNT || "4280686564",

  BANK_CATEGORY_ID: process.env.BANK_CATEGORY_ID || "1507399253918617700",
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || "1512868304891412572",

  PRICE_1_DAY: parseInt(process.env.PRICE_1_DAY) || 19,
  PRICE_7_DAYS: parseInt(process.env.PRICE_7_DAYS) || 69,
  PRICE_30_DAYS: parseInt(process.env.PRICE_30_DAYS) || 169,
  PRICE_LIFETIME: parseInt(process.env.PRICE_LIFETIME) || 199,
};
