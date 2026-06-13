const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const config = require("../../config");
const {
  ADMIN_ROLE_ID,
  BANK_CATEGORY_ID,
  ADMIN_PHONE,
} = config;
const { makeEmbed, EmbedColor } = require("../../utils/embedBuilder");
const { checkKeyReset } = require("../../services/keyService");
const { generateQrCode } = require("../../services/bankService");

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
      1: config.PRICE_1_DAY,
      7: config.PRICE_7_DAYS,
      30: config.PRICE_30_DAYS,
      0: config.PRICE_LIFETIME,
    };

    const price = priceMap[days];
    const durationLabel = days === 0 ? "Lifetime (ถาวร)" : `${days} วัน`;

    const paymentSelect = new StringSelectMenuBuilder()
      .setCustomId(`payment_method_${days}`)
      .setPlaceholder("เลือกวิธีชำระเงิน...")
      .addOptions([
        {
          label: "PromptPay (QR Code)",
          description: "สแกน QR Code พร้อมเพย์เพื่อชำระเงินล็อกยอดทันที",
          value: "promptpay",
          emoji: "<:iconthaiqr:1514883504830152736>",
        },
        {
          label: "TrueMoney Wallet",
          description: "ชำระผ่านซองอั่งเปา TrueMoney",
          value: "truemoney",
          emoji: "<:channels4_profile:1513129671418581084>",
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

    if (method === "promptpay") {
      await interaction.deferReply({ ephemeral: true });

      const priceMap = {
        1: config.PRICE_1_DAY,
        7: config.PRICE_7_DAYS,
        30: config.PRICE_30_DAYS,
        0: config.PRICE_LIFETIME,
      };

      const price = priceMap[days] ?? config.PRICE_LIFETIME;
      const durationLabel = days === 0 ? "Lifetime (ถาวร)" : `${days} วัน`;

      try {
        // Step 1: ขอสร้าง QR Code จาก EasySlip
        const qrResult = await generateQrCode(price);

        if (qrResult?.status !== 200 || !qrResult?.data?.image) {
          return interaction.editReply({
            embeds: [
              makeEmbed(
                "❌ ไม่สามารถสร้าง QR Code ได้",
                `เกิดข้อผิดพลาดในการขอสร้างพร้อมเพย์ QR: ${qrResult?.message ?? "ไม่สามารถติดต่อ API ได้"}\nกรุณาเลือกช่องทางการชำระเงินอื่น หรือติดต่อแอดมิน`,
                EmbedColor.ERROR,
              ),
            ],
          });
        }

        const guild = interaction.guild;
        const member = interaction.member;
        const user = interaction.user;

        // Step 2: สร้างช่องแชทส่วนตัว
        const channel = await guild.channels.create({
          name: `pay-${user.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-"),
          type: ChannelType.GuildText,
          parent: BANK_CATEGORY_ID || null,
          topic: "payment_method: promptpay",
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

        const { startInactivityTimer } = require("../../utils/inactivityManager");
        startInactivityTimer(channel);

        // Step 3: แปลง Base64 เป็น Buffer และเตรียมส่งไฟล์แนบ
        const buffer = Buffer.from(qrResult.data.image, "base64");
        const attachment = new AttachmentBuilder(buffer, {
          name: "qrcode.png",
        });

        const closeButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`close_bank_channel_${channel.id}`)
            .setLabel("✅ ปิดห้องนี้ (เสร็จสิ้น)")
            .setStyle(ButtonStyle.Danger),
        );

        // Step 4: ส่งข้อความพร้อมแนบภาพ QR Code โอนเงิน
        await channel.send({
          content: `<@${user.id}>`,
          embeds: [
            makeEmbed(
              "📱 PROMPTPAY QR CODE PAYMENT",
              [
                "```",
                `PRODUCT : Ready Manager License Key`,
                ``,
                `PACKAGE : ${durationLabel}`,
                `PRICE   : ${price}.-`,
                "```",
                `⭐ วิธีการชำระเงิน`,
                `1. สแกน QR Code ด้านล่างนี้เพื่อชำระเงินด้วยแอปพลิเคชันธนาคาร (ระบบทำการล็อกยอดเงินไว้ที่ **${price}** บาท เรียบร้อยแล้ว)`,
                `2. หลังจากโอนเงินเรียบร้อยแล้ว **กรุณาส่งรูปสลิปเข้ามาในช่องแชทนี้** เพื่อทำรายการตรวจสอบและรับคีย์อัตโนมัติ`,
                ``,
                `*หมายเหตุ: QR Code นี้ลงทะเบียนด้วยเบอร์พร้อมเพย์ \`${ADMIN_PHONE}\`*`,
              ].join("\n"),
              EmbedColor.INFO,
            ).setImage("attachment://qrcode.png"),
          ],
          files: [attachment],
          components: [closeButton],
        });

        return interaction.editReply({
          embeds: [
            makeEmbed(
              "✅ ห้องชำระเงินถูกสร้างแล้ว",
              `ห้องชำระเงิน ${channel} ถูกสร้างขึ้นเรียบร้อยแล้ว\nกรุณาเข้าไปสแกน QR Code และอัปโหลดสลิปที่นั่นได้เลยครับ`,
              EmbedColor.SUCCESS,
            ),
          ],
        });
      } catch (err) {
        console.error("[PromptPay] Failed to process payment request:", err);
        return interaction.editReply({
          embeds: [
            makeEmbed(
              "❌ เกิดข้อผิดพลาดของระบบ",
              `ไม่สามารถทำรายการสร้างพร้อมเพย์ได้ในขณะนี้: ${err.message}`,
              EmbedColor.ERROR,
            ),
          ],
        });
      }
    }

    if (method === "truemoney") {
      const {
        ModalBuilder,
        TextInputBuilder,
        TextInputStyle,
      } = require("discord.js");
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
  }

  if (interaction.customId === "reset_hwid_select") {
    await interaction.deferReply({ ephemeral: true });

    const userKey = interaction.values[0];
    const discordId = interaction.user?.id;

    try {
      await checkKeyReset(userKey, discordId);

      return interaction.editReply({
        embeds: [
          makeEmbed(
            "✅ รีเซ็ต HWID สำเร็จ (Reset Successful)",
            `คีย์ \`${userKey.slice(0, 15)}...\` ได้รับการเคลียร์ค่าล็อคเครื่อง (HWID) เรียบร้อยแล้ว สามารถนำไปเข้าสู่ระบบกับคอมพิวเตอร์เครื่องใหม่ได้ทันทีครับ`,
            EmbedColor.SUCCESS,
          ),
        ],
      });
    } catch (err) {
      console.error("[Select Reset] Error resetting HWID:", err);

      const errorMessages = {
        KEY_NOT_FOUND: "ไม่พบรหัสคีย์นี้ในระบบ / License key not found.",
        KEY_NOT_CLAIMED:
          "คีย์นี้ยังไม่ถูกเคลมเปิดใช้งาน / Key not claimed yet.",
        NOT_OWNER:
          "คุณไม่ได้เป็นเจ้าของไลเซนส์คีย์นี้ / Not the owner of this key.",
        COOLDOWN_ACTIVE: formatCooldown(err.cooldown),
        MISSING_FIELDS: "ข้อมูลไม่ครบถ้วน / Missing required fields.",
      };

      const description =
        errorMessages[err.code] ??
        err.message ??
        "โปรดลองใหม่อีกครั้งในภายหลัง / Please try again later.";

      return interaction.editReply({
        embeds: [
          makeEmbed("❌ รีเซ็ต HWID ไม่สำเร็จ", description, EmbedColor.ERROR),
        ],
      });
    }
  }
}

function formatCooldown(cooldown) {
  if (!cooldown?.availableAt)
    return "คูลดาวน์ยังทำงานอยู่ โปรดรอสักครู่ / Cooldown active.";
  const availableAt = new Date(cooldown.availableAt);
  const time = `<t:${Math.floor(availableAt.getTime() / 1000)}:R>`;
  return `คูลดาวน์ยังทำงานอยู่ — คุณจะสามารถรีเซ็ตได้อีกครั้งใน ${time}`;
}

module.exports = { handleSelectMenu };
