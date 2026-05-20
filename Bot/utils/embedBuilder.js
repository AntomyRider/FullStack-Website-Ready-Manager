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
function makeVerifyEmbed(imageUrl) {
  return new EmbedBuilder()
    .setDescription(
      " **<:ReadyIcon:1506734243898855505> READY MANAGER : โปรแกรมช่วยโพสต์**",
    )
    .setColor(EmbedColor.SUCCESS)
    .setImage(imageUrl)
    .setTimestamp();
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
