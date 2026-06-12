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

client.login(TOKEN);