const axios = require("axios");
const config = require("../config");

let cachedConfig = null;

async function getDynamicConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }
  return fetchAndCacheConfig();
}

async function fetchAndCacheConfig() {
  try {
    const res = await axios.get(`${config.API_URL}/bot-config`, {
      headers: {
        Authorization: `Bearer ${config.BOT_SECRET}`
      }
    });
    if (res.data.success && res.data.data) {
      cachedConfig = res.data.data;
      
      // Mutate the config object to update references in other files
      config.PRICE_1_DAY = cachedConfig.price1Day;
      config.PRICE_7_DAYS = cachedConfig.price7Days;
      config.PRICE_30_DAYS = cachedConfig.price30Days;
      config.PRICE_LIFETIME = cachedConfig.priceLifetime;
      config.BANK_NAME = cachedConfig.bankName;
      config.BANK_HOLDER = cachedConfig.bankHolder;
      config.BANK_ACCOUNT = cachedConfig.bankAccount;
      config.ADMIN_PHONE = cachedConfig.adminPhone;
      config.VERIFY_CHANNEL_ID = cachedConfig.verifyChannelId;
      config.LOG_CHANNEL_ID = cachedConfig.logChannelId;

      console.log("📥 [BotConfigService] Fetched and cached fresh config from Server.");
      return cachedConfig;
    }
  } catch (err) {
    console.error("❌ [BotConfigService] Failed to fetch bot config from server:", err.message);
  }
  
  // Return fallback defaults if API fails
  const fallback = {
    price1Day: parseInt(process.env.PRICE_1_DAY) || 19,
    price7Days: parseInt(process.env.PRICE_7_DAYS) || 69,
    price30Days: parseInt(process.env.PRICE_30_DAYS) || 169,
    priceLifetime: parseInt(process.env.PRICE_LIFETIME) || 199,
    embedImageUrl: "https://img2.pic.in.th/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f776174747061642d6d656469612d736572766963652f53746f7279496d6167652f412d77586c7a2d354458414c76413d3d2d313134363638353832352e3136623139303963393361393730.gif",
    embedTitle: "READY MANAGER : โปรแกรมช่วยโพสต์",
    embedDescription: "**<:ReadyIcon:1506734243898855505> READY MANAGER : โปรแกรมช่วยโพสต์**\n\n```\n⚠️ WARNING\n- กรุณาสร้างซองอั่งเปาให้มียอดเงินเพียงพอต่อราคาคีย์ที่ต้องการซื้อ\n- หากเติมเงินเกินจากราคาคีย์ ระบบจะไม่คืนส่วนต่างทุกกรณี\n```",
    bankName: process.env.BANK_NAME || "กรุงไทย",
    bankHolder: process.env.BANK_HOLDER || "นครินทร์ งานยางหวาย",
    bankAccount: process.env.BANK_ACCOUNT || "4280686564",
    adminPhone: process.env.ADMIN_PHONE || "0832584267",
    verifyChannelId: "1506243441007398964",
    logChannelId: "1512868304891412572"
  };

  config.PRICE_1_DAY = fallback.price1Day;
  config.PRICE_7_DAYS = fallback.price7Days;
  config.PRICE_30_DAYS = fallback.price30Days;
  config.PRICE_LIFETIME = fallback.priceLifetime;
  config.BANK_NAME = fallback.bankName;
  config.BANK_HOLDER = fallback.bankHolder;
  config.BANK_ACCOUNT = fallback.bankAccount;
  config.ADMIN_PHONE = fallback.adminPhone;
  config.VERIFY_CHANNEL_ID = fallback.verifyChannelId;
  config.LOG_CHANNEL_ID = fallback.logChannelId;

  return fallback;
}

function clearConfigCache() {
  cachedConfig = null;
  console.log("♻️ [BotConfigService] Config cache cleared.");
}

module.exports = {
  getDynamicConfig,
  fetchAndCacheConfig,
  clearConfigCache
};
