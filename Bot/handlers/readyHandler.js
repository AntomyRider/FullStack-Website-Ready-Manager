const axios = require("axios");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const { VERIFY_CHANNEL_ID, EMBED_IMAGE_URL, API_URL } = require("../config");
const { makeVerifyEmbed } = require("../utils/embedBuilder");
const { getDynamicConfig } = require("../services/botConfigService");

/**
 * ส่ง/อัปเดต embed + ปุ่ม ไปยัง verify channel
 * ลบข้อความเก่าของบอทก่อนส่งใหม่เสมอในรอบแรก
 */
let lastStatsString = "";

async function onReady(client) {
  try {
    const config = await getDynamicConfig();
    const channel = await client.channels.fetch(config.verifyChannelId || VERIFY_CHANNEL_ID);
    if (!channel) return console.error("❌ ไม่พบ verify channel");

    // ลบข้อความเก่าของบอทออกทั้งหมดเพื่อให้การเริ่มระบบคลีน
    await clearBotMessages(channel, client.user.id);
    
    // ส่งข้อความสเตตัสใหม่และอัปเดตยอด
    await updateVerifyMessage(client);

    // ตั้งระบบอัปเดตสต็อกอัตโนมัติทุกๆ 10 วินาที
    setInterval(() => {
      updateVerifyMessage(client).catch((err) => {
        console.error("❌ เกิดข้อผิดพลาดในการอัปเดตสต็อกอัตโนมัติ:", err.message);
      });
    }, 10000);

    console.log(`✅ Bot ready! Logged in as ${client.user.tag}`);
  } catch (err) {
    console.error("❌ Error ใน onReady:", err);
  }
}

async function updateVerifyMessage(client) {
  try {
    const config = await getDynamicConfig();
    const channel = await client.channels.fetch(config.verifyChannelId || VERIFY_CHANNEL_ID);
    if (!channel) return console.error("❌ ไม่พบ verify channel");

    // 1. ดึงสถิติจาก Server
    let stats = null;
    let total = null;
    let recentPurchases = [];
    try {
      const res = await axios.get(`${API_URL}/licenses/stock-stats`);
      if (res.data.success) {
        stats = res.data.stats;
        total = res.data.total;
        recentPurchases = res.data.recentPurchases || [];
      }
    } catch (apiErr) {
      console.error("⚠️ ไม่สามารถดึงสถิติสต็อกจาก Server ได้:", apiErr.message);
    }

    // ตรวจสอบการเปลี่ยนแปลงของข้อมูล (รวมถึงการอัปเดตตั้งค่า BotConfig) เพื่อประหยัด API rate limit
    const currentStatsString = JSON.stringify({ stats, total, recentPurchases, updatedAt: config.updatedAt });

    const messages = await channel.messages.fetch({ limit: 20 });
    const botMsg = messages.find((m) => m.author.id === client.user.id);

    if (botMsg) {
      // หากข้อมูลไม่มีการเปลี่ยนแปลง ไม่ต้องแก้ไขข้อความ
      if (currentStatsString === lastStatsString) {
        return;
      }
    }

    // 2. สร้าง Embed และ Row
    const embed = makeVerifyEmbed(config.embedImageUrl || EMBED_IMAGE_URL, stats, total, recentPurchases, config);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_key")
        .setLabel("BUY KEY")
        .setStyle(ButtonStyle.Success)
        .setEmoji("💸"),

      new ButtonBuilder()
        .setCustomId("get_trial_key")
        .setLabel("TRIAL KEY")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎁"),

      new ButtonBuilder()
        .setCustomId("reset_hwid")
        .setLabel("RESET HWID")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔁"),

      new ButtonBuilder()
        .setCustomId("open_key_modal")
        .setLabel("CLAIM KEY")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:key:1506736572618510336>"),
    );

    if (botMsg) {
      // แก้ไขข้อความเดิม
      await botMsg.edit({ embeds: [embed], components: [row] });
      lastStatsString = currentStatsString;
      console.log("✅ อัปเดตสถิติคลังสินค้าสำเร็จ (Panel Updated due to changes)");
    } else {
      // ส่งใหม่หากไม่พบ
      await channel.send({ embeds: [embed], components: [row] });
      lastStatsString = currentStatsString;
      console.log("✅ ส่งแผงควบคุมหลักใหม่สำเร็จ (Panel Sent)");
    }

  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาดในการอัปเดต Panel:", err);
  }
}

async function clearBotMessages(channel, botId) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const botMessages = messages.filter((m) => m.author.id === botId);
    for (const msg of botMessages.values()) {
      await msg.delete().catch(() => {});
    }
  } catch (err) {
    console.error("Error clearing bot messages:", err);
  }
}

module.exports = { onReady, updateVerifyMessage };
