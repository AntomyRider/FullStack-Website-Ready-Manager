const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
} = require("discord.js");

const { TOKEN } = require("./config");
const { onReady } = require("./handlers/readyHandler");
const { onInteraction } = require("./handlers/interactionHandler");
const { handleBankSlipMessage } = require("./handlers/bankSlipHandler"); // [1] เพิ่ม 
const { resetInactivityTimer, startInactivityTimer } = require("./utils/inactivityManager");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("clientReady", () => {
  onReady(client);
  
  // Start inactivity timers for any existing pay- channels on startup
  try {
    client.guilds.cache.forEach(guild => {
      guild.channels.cache.forEach(ch => {
        if (ch.type === ChannelType.GuildText && ch.name.startsWith("pay-")) {
          startInactivityTimer(ch);
        }
      });
    });
  } catch (err) {
    console.error("[Inactivity] Failed to start startup timers:", err);
  }
});

client.on("interactionCreate", onInteraction);
client.on("messageCreate", handleBankSlipMessage); // [2] เพิ่ม event listener
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.channel.name?.startsWith("pay-")) {
    resetInactivityTimer(message.channel);
  }
});

// ป้องกันบอทแครชจากข้อผิดพลาดของ Discord API
client.on("error", (err) => {
  console.error("❌ Discord Client Error:", err);
});

// ป้องกันบอทแครชจาก Unhandled Promise Rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

// เริ่มต้น Express Server สำหรับรับการแจ้งเตือนตั้งค่าอัปเดตจากหลังบ้าน
const express = require("express");
const expressApp = express();
const { clearConfigCache } = require("./services/botConfigService");
const { updateVerifyMessage } = require("./handlers/readyHandler");

expressApp.post("/update-panel", express.json(), async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.BOT_SECRET || "READY_MANAGER_BOT_SECRET_2026"}`) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    clearConfigCache(); // ล้าง Cache เพื่อให้บอทดึงข้อมูลล่าสุดจากฐานข้อมูลในการรีเฟรชครั้งต่อไป
    await updateVerifyMessage(client); // สั่งรีเฟรช Embed บนห้องดิสคอร์ดทันที
    res.json({ success: true, message: "Discord Embed panel updated successfully" });
  } catch (err) {
    console.error("❌ Failed to update discord panel via Webhook:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const BOT_PORT = process.env.BOT_PORT || 3005;
expressApp.listen(BOT_PORT, () => {
  console.log(`🤖 Bot internal API listening on port ${BOT_PORT}`);
});

client.login(TOKEN);