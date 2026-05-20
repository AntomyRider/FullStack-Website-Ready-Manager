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

client.login(TOKEN);