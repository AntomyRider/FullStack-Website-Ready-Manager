const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const { VERIFY_CHANNEL_ID, EMBED_IMAGE_URL } = require("../config");
const { makeVerifyEmbed } = require("../utils/embedBuilder");

/**
 * ส่ง embed + ปุ่มกรอก Key ไปยัง verify channel
 * ลบข้อความเก่าของบอทก่อนส่งใหม่เสมอ
 */
async function onReady(client) {
  try {
    const channel = await client.channels.fetch(VERIFY_CHANNEL_ID);
    if (!channel) return console.error("❌ ไม่พบ verify channel");

    await clearBotMessages(channel, client.user.id);
    await sendVerifyMessage(channel);

    console.log(`✅ Bot ready! Logged in as ${client.user.tag}`);
  } catch (err) {
    console.error("❌ Error ใน onReady:", err);
  }
}

// ---- helpers ----

async function clearBotMessages(channel, botId) {
  const messages = await channel.messages.fetch({ limit: 20 });
  const botMessages = messages.filter((m) => m.author.id === botId);
  for (const msg of botMessages.values()) {
    await msg.delete().catch(() => {});
  }
}

async function sendVerifyMessage(channel) {
  const embed = makeVerifyEmbed(EMBED_IMAGE_URL);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_key_modal")
      .setLabel("CLIAM KEY")
      .setStyle(ButtonStyle.Success)
      .setEmoji("<:key:1506736572618510336>"),

    new ButtonBuilder()
      .setCustomId("reset_hwid")
      .setLabel("RESET HWID")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("<:refresh:1506737280608370910>"),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

module.exports = { onReady };
