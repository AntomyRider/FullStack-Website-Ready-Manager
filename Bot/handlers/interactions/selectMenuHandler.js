const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  PRICE_1_DAY,
  PRICE_7_DAYS,
  PRICE_30_DAYS,
  PRICE_LIFETIME,
  ADMIN_ROLE_ID,
  BANK_CATEGORY_ID,
} = require("../../config");
const { makeEmbed, EmbedColor } = require("../../utils/embedBuilder");

async function handleSelectMenu(interaction) {
  // Step 1: เลือก package → แสดง dropdown วิธีชำระเงิน
  if (interaction.customId === "buy_key_select") {
    const daysMap = {
      buy_option_1: 1,
      buy_option_7: 7,
      buy_option_30: 30,
      buy_option_0: 0,
    };

    const days = daysMap[interaction.values[0]];

    const priceMap = {
      1: PRICE_1_DAY,
      7: PRICE_7_DAYS,
      30: PRICE_30_DAYS,
      0: PRICE_LIFETIME,
    };

    const price = priceMap[days];
    const durationLabel = days === 0 ? "Lifetime (ถาวร)" : `${days} วัน`;

    const paymentSelect = new StringSelectMenuBuilder()
      .setCustomId(`payment_method_${days}`)
      .setPlaceholder("เลือกวิธีชำระเงิน...")
      .addOptions([
        {
          label: "TrueMoney Wallet",
          description: "ชำระผ่านซองอั่งเปา TrueMoney",
          value: "truemoney",
          emoji: "<:channels4_profile:1513129671418581084>",
        },
        {
          label: "โอนผ่านธนาคาร",
          description: "ส่งสลิปให้แอดมินตรวจสอบ",
          value: "bank",
          emoji: "<:__:1513130052370567348>",
        },
      ]);

    return interaction.reply({
      embeds: [
        makeEmbed(
          null,
          [
            "```",
            `- Package : ${durationLabel}`,
            `- Price   : ${price}.-`,
            "```",
          ].join("\n"),
          EmbedColor.INFO,
        ),
      ],
      components: [new ActionRowBuilder().addComponents(paymentSelect)],
      ephemeral: true,
    });
  }

  // Step 2: เลือกวิธีชำระเงิน
  if (interaction.customId.startsWith("payment_method_")) {
    const days = parseInt(interaction.customId.replace("payment_method_", ""));
    const method = interaction.values[0];

    if (method === "truemoney") {
      const { ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
      const modal = new ModalBuilder()
        .setCustomId(`voucher_modal_${days}`)
        .setTitle("TrueMoney Gift");

      const voucherInput = new TextInputBuilder()
        .setCustomId("voucher_url")
        .setLabel("ลิงก์ซองอั่งเปา")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(voucherInput));
      return interaction.showModal(modal);
    }

    if (method === "bank") {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const member = interaction.member;
      const user = interaction.user;

      const priceMap = {
        1: PRICE_1_DAY,
        7: PRICE_7_DAYS,
        30: PRICE_30_DAYS,
        0: PRICE_LIFETIME,
      };

      const price = priceMap[days] ?? PRICE_LIFETIME;
      const durationLabel = days === 0 ? "Lifetime (ถาวร)" : `${days} วัน`;

      try {
        const channel = await guild.channels.create({
          name: `pay-${user.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-"),
          type: ChannelType.GuildText,
          parent: BANK_CATEGORY_ID || null,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: member.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
              ],
            },
            {
              id: ADMIN_ROLE_ID,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.AttachFiles,
              ],
            },
            {
              id: guild.members.me.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ],
        });

        const closeButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`close_bank_channel_${channel.id}`)
            .setLabel("✅ ปิดห้องนี้ (เสร็จสิ้น)")
            .setStyle(ButtonStyle.Danger),
        );

        await channel.send({
          content: `<@${user.id}>`,
          embeds: [
            makeEmbed(
              "🏦 BANK TRANSFER PAYMENT",
              [
                "```",
                `📦 สินค้า`,
                `- แพ็คเกจ : ${durationLabel}`,
                `- ราคา    : ${price}.-`,
                "```",
                `⭐ รายละเอียดบัญชี`,
                "```",
                `- ธนาคาร  : กรุงไทย`,
                `- เลขบัญชี : 4280686564`,
                `- ชื่อบัญชี  : นครินทร์ งานยางหวาย`,
                "```",
              ].join("\n"),
              EmbedColor.INFO,
            ),
          ],
          components: [closeButton],
        });

        return interaction.editReply({
          embeds: [
            makeEmbed(
              "✅ ห้องชำระเงินถูกสร้างแล้ว",
              `ห้อง ${channel} ถูกสร้างขึ้นสำหรับคุณแล้ว\nกรุณาไปส่งสลิปในห้องนั้นได้เลย`,
              EmbedColor.SUCCESS,
            ),
          ],
        });
      } catch (err) {
        console.error("[Bank] Failed to create private channel:", err);
        return interaction.editReply({
          embeds: [
            makeEmbed(
              "❌ เกิดข้อผิดพลาด",
              "ไม่สามารถสร้างห้องชำระเงินได้ โปรดติดต่อแอดมิน",
              EmbedColor.ERROR,
            ),
          ],
        });
      }
    }
  }
}

module.exports = { handleSelectMenu };
