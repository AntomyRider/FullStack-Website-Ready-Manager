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
const { getUserKeys } = require("../../services/keyService");

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
    await interaction.deferReply({ ephemeral: true });

    try {
      const res = await getUserKeys(interaction.user.id);
      if (!res.success || !res.keys || res.keys.length === 0) {
        return interaction.editReply({
          embeds: [
            makeEmbed(
              "❌ ไม่พบไลเซนส์คีย์ของคุณ",
              "ระบบไม่พบคีย์ใช้งานที่เปิดอยู่ของคุณในปัจจุบัน / You do not have any active keys.",
              EmbedColor.ERROR
            )
          ]
        });
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId("reset_hwid_select")
        .setPlaceholder("เลือกคีย์ที่ต้องการรีเซ็ต HWID...")
        .addOptions(
          res.keys.slice(0, 25).map((k) => {
            const isLifetime = !k.expDays || k.expDays === 0;
            const typeLabel = isLifetime ? "Lifetime" : `${k.expDays} วัน`;
            const hwidLabel = k.hwid ? `HWID: ${k.hwid.slice(0, 20)}...` : "ยังไม่ผูก HWID";

            return {
              label: `คีย์: ${k.key.slice(0, 15)}...`,
              description: `แพ็กเกจ: ${typeLabel} | ${hwidLabel}`,
              value: k.key,
              emoji: "🔑",
            };
          })
        );

      const row = new ActionRowBuilder().addComponents(select);

      return interaction.editReply({
        embeds: [
          makeEmbed(
            "🔄 เลือกคีย์ที่ต้องการรีเซ็ต HWID (Select Key to Reset)",
            "โปรดเลือกคีย์การ์ดด้านล่างที่คุณต้องการทำรายการรีเซ็ตล็อคเครื่อง (HWID Reset)",
            EmbedColor.INFO
          )
        ],
        components: [row]
      });
    } catch (err) {
      console.error("[Reset Button] Error querying user keys:", err);
      return interaction.editReply({
        embeds: [
          makeEmbed(
            "❌ เกิดข้อผิดพลาดของระบบ",
            "ไม่สามารถติดต่อเซิร์ฟเวอร์หลังบ้านได้ โปรดลองอีกครั้งภายหลัง",
            EmbedColor.ERROR
          )
        ]
      });
    }
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
    
    const { clearInactivityTimer } = require("../../utils/inactivityManager");
    clearInactivityTimer(channelId);

    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({
        embeds: [
          makeEmbed("❌ ไม่มีสิทธิ์", "เฉพาะ Admin เท่านั้น", EmbedColor.ERROR),
        ],
        ephemeral: true,
      }).catch(console.error);
    }

    try {
      await interaction.reply({
        embeds: [
          makeEmbed(
            "🗑️ กำลังปิดห้อง...",
            "ห้องนี้จะถูกลบใน 5 วินาที",
            EmbedColor.INFO,
          ),
        ],
      });
    } catch (err) {
      console.warn("[Close Bank] Failed to reply to interaction, proceeding to delete channel:", err.message);
    }

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
