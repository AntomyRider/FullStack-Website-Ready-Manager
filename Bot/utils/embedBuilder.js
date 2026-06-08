const { EmbedBuilder } = require("discord.js");

const EmbedColor = {
  SUCCESS: 0x57f287,
  WARNING: 0xfee75c,
  ERROR: 0xed4245,
  INFO: 0x5865f2,
};

const EmbedIcon = {
  SUCCESS: "✅",
  WARNING: "⚠️",
  ERROR: "❌",
  INFO: "🔑",
};

/**
 * Embed ทั่วไป
 */
function makeEmbed(title, description, color) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`${description}`)
    .setColor(color)
    .setTimestamp();
}

/**
 * Embed สำเร็จ
 */
function makeSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`${EmbedIcon.SUCCESS} ${title}`)
    .setDescription(`> ${description}`)
    .setColor(EmbedColor.SUCCESS)
    .setTimestamp();
}

/**
 * Embed ข้อผิดพลาด
 */
function makeErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`${EmbedIcon.ERROR} ${title}`)
    .setDescription(`> ${description}`)
    .setColor(EmbedColor.ERROR)
    .setTimestamp();
}

/**
 * Embed คำเตือน
 */
function makeWarningEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`${EmbedIcon.WARNING} ${title}`)
    .setDescription(`> ${description}`)
    .setColor(EmbedColor.WARNING)
    .setTimestamp();
}

/**
 * Embed ยืนยัน Key (ส่งใน verify channel)
 */
function makeVerifyEmbed(imageUrl, stats, total, recentPurchases) {
  const embed = new EmbedBuilder()
    .setDescription(
      [
        "**<:ReadyIcon:1506734243898855505> READY MANAGER : โปรแกรมช่วยโพสต์**",
        "",
        "```",
        "⚠️ WARNING\n",
        "- กรุณาสร้างซองอั่งเปาให้มียอดเงินเพียงพอต่อราคาคีย์ที่ต้องการซื้อ",
        "- หากเติมเงินเกินจากราคาคีย์ ระบบจะไม่คืนส่วนต่างทุกกรณี",
        "```",
      ].join("\n"),
    )
    .setColor(EmbedColor.SUCCESS)
    .setImage(imageUrl)
    .setTimestamp();

  if (stats && total) {
    embed.addFields({
      name: " ",
      value: [
        "```",
        `⭐ TOTAL STOCK KEYS ⭐`,
        `----------------------------------------`,
        `⚡ 1 Days   - [ 📦 ${stats.days1.remaining} Keys ] `,
        `📅 7 Days   - [ 📦 ${stats.days7.remaining} Keys ] `,
        `🧩 30 Days  - [ 📦 ${stats.days30.remaining} Keys ] `,
        `♾️ Lifetime - [ 📦 ${stats.lifetime.remaining} Keys ] `,
        `----------------------------------------`,
        `💰 SOLD - ${total.sold} Keys`,
        "```",
      ].join("\n"),
      inline: false,
    });
  }

  if (recentPurchases && recentPurchases.length > 0) {
    const list = recentPurchases.map((p) => {
      const pkg = p.days === 0 ? "Lifetime (ถาวร)" : `${p.days} วัน`;
      const timeTag = `<t:${Math.floor(new Date(p.purchasedAt).getTime() / 1000)}:R>`;
      return `• <@${p.discordId}> ซื้อแพ็กเกจ **${pkg}** (${timeTag})`;
    });

    embed.addFields({
      name: "🛒 ผู้ซื้อล่าสุด (Recent Purchases)",
      value: list.join("\n"),
      inline: false,
    });
  }

  return embed;
}

module.exports = {
  makeEmbed,
  makeSuccessEmbed,
  makeErrorEmbed,
  makeWarningEmbed,
  makeVerifyEmbed,
  EmbedColor,
  EmbedIcon,
};
