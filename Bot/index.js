const {
  Client,
  GatewayIntentBits,
  Partials,
} = require("discord.js");

const { TOKEN } = require("./config");
const { onReady } = require("./handlers/readyHandler");
const { onInteraction } = require("./handlers/interactionHandler");

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

client.once("clientReady", () => onReady(client));
client.on("interactionCreate", onInteraction);

// ป้องกันบอทแครชจากข้อผิดพลาดของ Discord API
client.on("error", (err) => {
  console.error("❌ Discord Client Error:", err);
});

// ป้องกันบอทแครชจาก Unhandled Promise Rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

client.login(TOKEN);