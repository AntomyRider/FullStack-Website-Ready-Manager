const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require("discord.js");
const {
  PRICE_1_DAY,
  PRICE_7_DAYS,
  PRICE_30_DAYS,
  PRICE_LIFETIME,
  ADMIN_ROLE_ID,
} = require("../../config");
const { makeEmbed, EmbedColor } = require("../../utils/embedBuilder");

async function handleButton(interaction) {
  if (interaction.customId === "open_key_modal") {
    const modal = new ModalBuilder()
      .setCustomId("key_modal")
      .setTitle("Enter Your Key");

    const keyInput = new TextInputBuilder()
      .setCustomId("user_key")
      .setLabel("Key")
      .setPlaceholder("xxxx-xxxx-xxxx-xxxx")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(4)
      .setMaxLength(100);

    modal.addComponents(new ActionRowBuilder().addComponents(keyInput));
    return interaction.showModal(modal);
  }

  if (interaction.customId === "reset_hwid") {
    const modal = new ModalBuilder()
      .setCustomId("reset_modal")
      .setTitle("Reset HWID");

    const keyInput = new TextInputBuilder()
      .setCustomId("user_key")
      .setLabel("Key")
      .setPlaceholder("xxxx-xxxx-xxxx-xxxx")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(keyInput));
    return interaction.showModal(modal);
  }

  if (interaction.customId === "buy_key") {
    const select = new StringSelectMenuBuilder()
      .setCustomId("buy_key_select")
      .setPlaceholder("Select a type of key...")
      .addOptions([
        {
          label: "1 Day",
          description: `ราคา ${PRICE_1_DAY} บาท | ใช้งาน 1 วัน`,
          value: "buy_option_1",
          emoji: "⚡",
        },
        {
          label: "7 Days",
          description: `ราคา ${PRICE_7_DAYS} บาท | ใช้งาน 7 วัน`,
          value: "buy_option_7",
          emoji: "📅",
        },
        {
          label: "30 Days",
          description: `ราคา ${PRICE_30_DAYS} บาท | ใช้งาน 30 วัน`,
          value: "buy_option_30",
          emoji: "🧩",
        },
        {
          label: "Lifetime",
          description: `ราคา ${PRICE_LIFETIME} บาท | ใช้งานถาวร`,
          value: "buy_option_0",
          emoji: "♾️",
        },
      ]);

    const row = new ActionRowBuilder().addComponents(select);

    return interaction.reply({
      embeds: [
        makeEmbed(
          "💸 เลือกประเภทคีย์ที่ต้องการซื้อ (Select Key Type)",
          "โปรดเลือกแพ็กเกจคีย์ที่คุณต้องการสั่งซื้อ",
          EmbedColor.INFO,
        ),
      ],
      components: [row],
      ephemeral: true,
    });
  }

  // ปุ่มปิดห้อง Bank (Admin กด)
  if (interaction.customId.startsWith("close_bank_channel_")) {
    const channelId = interaction.customId.replace("close_bank_channel_", "");

    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({
        embeds: [
          makeEmbed("❌ ไม่มีสิทธิ์", "เฉพาะ Admin เท่านั้น", EmbedColor.ERROR),
        ],
        ephemeral: true,
      });
    }

    await interaction.reply({
      embeds: [
        makeEmbed(
          "🗑️ กำลังปิดห้อง...",
          "ห้องนี้จะถูกลบใน 5 วินาที",
          EmbedColor.INFO,
        ),
      ],
    });

    setTimeout(async () => {
      try {
        const ch = interaction.guild.channels.cache.get(channelId);
        if (ch) await ch.delete("Bank payment completed");
      } catch (err) {
        console.error("[Bank] Failed to delete channel:", err);
      }
    }, 5000);

    return;
  }
}

module.exports = { handleButton };
