const { ChannelType } = require("discord.js");

const inactivityTimeouts = new Map();
const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes in ms

/**
 * Start inactivity timer for a channel.
 * @param {import('discord.js').GuildTextBasedChannel} channel 
 */
function startInactivityTimer(channel) {
  // Clear existing timer if any
  clearInactivityTimer(channel.id);

  const timeout = setTimeout(async () => {
    try {
      // Fetch channel again to make sure it still exists and we have it fresh
      const ch = channel.guild.channels.cache.get(channel.id) || 
                 await channel.guild.channels.fetch(channel.id).catch(() => null);
      
      if (ch) {
        // Send alert message first
        const { makeEmbed, EmbedColor } = require("./embedBuilder");
        
        await ch.send({
          embeds: [
            makeEmbed(
              "⏳ หมดเวลาทำรายการ (Transaction Timeout)",
              "ไม่พบความเคลื่อนไหวใดๆ ภายในห้องชำระเงินนี้เกิน 10 นาที ระบบจะทำการลบห้องนี้อัตโนมัติในอีก 5 วินาที",
              EmbedColor.ERROR
            )
          ]
        }).catch(() => {});
        
        // Wait 5 seconds before actual deletion
        setTimeout(async () => {
          try {
            await ch.delete("Inactivity timeout");
          } catch (err) {
            console.error(`[Inactivity] Failed to delete channel ${ch.id}:`, err);
          }
        }, 5000);
      }
    } catch (err) {
      console.error(`[Inactivity] Error checking/deleting channel ${channel.id}:`, err);
    } finally {
      inactivityTimeouts.delete(channel.id);
    }
  }, INACTIVITY_LIMIT);

  inactivityTimeouts.set(channel.id, timeout);
  console.log(`[Inactivity] Started 10-minute timer for channel: ${channel.name} (${channel.id})`);
}

/**
 * Reset inactivity timer for a channel.
 * @param {import('discord.js').GuildTextBasedChannel} channel 
 */
function resetInactivityTimer(channel) {
  if (inactivityTimeouts.has(channel.id)) {
    startInactivityTimer(channel);
    console.log(`[Inactivity] Reset timer for channel: ${channel.name} (${channel.id})`);
  }
}

/**
 * Clear inactivity timer for a channel.
 * @param {string} channelId 
 */
function clearInactivityTimer(channelId) {
  if (inactivityTimeouts.has(channelId)) {
    clearTimeout(inactivityTimeouts.get(channelId));
    inactivityTimeouts.delete(channelId);
    console.log(`[Inactivity] Cleared timer for channel ID: ${channelId}`);
  }
}

module.exports = {
  startInactivityTimer,
  resetInactivityTimer,
  clearInactivityTimer
};
