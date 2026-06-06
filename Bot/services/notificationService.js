const { makeEmbed, EmbedColor } = require("../utils/embedBuilder");
const { LOG_CHANNEL_ID } = require("../config");

async function sendTopupSuccess(client, data) {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = makeEmbed(
    "💰 TRUE MONEY WALLET",
    [
      "```",
      `[ 👤 USER    ] ${data.tag} (${data.discordId})`,
      `[ 📦 PACKAGE ] ${data.durationLabel}`,
      `[ 💵 BALANCE ] ${data.amount / 100} Bath`,
      `[ 🔑 KEY     ] ${data.key}`,
      `[ 🕐 TIME    ] <t:${Math.floor(Date.now() / 1000)}:F>`,
      "```",
    ].join("\n"),
    EmbedColor.SUCCESS,
  );

  await channel.send({ embeds: [embed] }).catch(console.error);
}

module.exports = { sendTopupSuccess };
