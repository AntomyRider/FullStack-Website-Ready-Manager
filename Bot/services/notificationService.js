const { makeEmbed, EmbedColor } = require("../utils/embedBuilder");
const { LOG_CHANNEL_ID } = require("../config");

/**
 * @param {import('discord.js').Client} client
 * @param {{
 *   discordId: string,
 *   tag: string,
 *   durationLabel: string,
 *   amount: number,       // หน่วย satang เสมอ
 *   key: string,
 *   method: "bank" | "truemoney" | "promptpay",
 *   // bank/promptpay only
 *   senderName?: string,
 *   senderBank?: string,
 *   receiverBank?: string,
 *   transRef?: string,
 * }} data
 */
async function sendTopupSuccess(client, data) {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const baht = data.amount / 100;
  const time = `<t:${Math.floor(Date.now() / 1000)}:F>`;

  let title = "🏦 BANK TRANSFER";
  if (data.method === "truemoney") {
    title = "💚 TRUEMONEY WALLET";
  } else if (data.method === "promptpay") {
    title = "📱 PROMPTPAY (QR CODE)";
  }

  const lines = [
    "```",
    `[ 👤 USER    ] ${data.tag} (${data.discordId})`,
    `[ 📦 PACKAGE ] ${data.durationLabel}`,
    `[ 💵 AMOUNT  ] ${baht} Bath`,
  ];

  if (data.method === "bank" || data.method === "promptpay") {
    if (data.senderName) lines.push(`[ 🏧 SENDER  ] ${data.senderName} · ${data.senderBank ?? "-"}`);
    if (data.receiverBank) lines.push(`[ 🏦 BANK    ] ${data.receiverBank}`);
    if (data.transRef)    lines.push(`[ 🔖 REF    ] ${data.transRef}`);
  }

  lines.push(
    `[ 🔑 KEY     ] ${data.key}`,
    `[ 🕐 TIME    ] ${time}`,
    "```"
  );

  const embed = makeEmbed(title, lines.join("\n"), EmbedColor.SUCCESS);
  await channel.send({ embeds: [embed] }).catch(console.error);
}

module.exports = { sendTopupSuccess };