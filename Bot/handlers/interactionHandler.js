const { sendTopupSuccess } = require("../services/notificationService");
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const axios = require("axios");

const {
  ROLE_ID,
  ADMIN_PHONE,
  BOT_SECRET,
  PRICE_1_DAY,
  PRICE_7_DAYS,
  PRICE_30_DAYS,
  PRICE_LIFETIME,
  API_URL,
  ADMIN_ROLE_ID,
  BANK_CATEGORY_ID,
} = require("../config");
const { checkKey, checkKeyReset } = require("../services/keyService");
const { redeemRaw } = require("../services/voucherService");
const { makeEmbed, EmbedColor } = require("../utils/embedBuilder");
const { updateVerifyMessage } = require("./readyHandler");

async function onInteraction(interaction) {
  try {
    if (interaction.isButton()) return handleButton(interaction);
    if (interaction.isStringSelectMenu()) return handleSelectMenu(interaction);
    if (interaction.isModalSubmit()) return handleModal(interaction);
  } catch (err) {
    console.error("❌ Interaction Error:", err);
    await safeReplyError(interaction);
  }
}

// ---- Button Handler ----

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

// ---- Select Menu Handler ----

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

// ---- Modal Handler ----

async function handleModal(interaction) {
  const { customId } = interaction;

  if (customId === "key_modal") return handleKeyModal(interaction);
  if (customId === "reset_modal") return handleResetModal(interaction);
  if (customId.startsWith("voucher_modal_"))
    return handleVoucherModal(interaction);
}

async function handleKeyModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const userKey = interaction.fields.getTextInputValue("user_key")?.trim();
  const discordId = interaction.user?.id;
  const member = interaction.member;

  if (!userKey || !discordId || !member) {
    return interaction.editReply({
      embeds: [
        makeEmbed("❌ Incomplete Data", "Please try again.", EmbedColor.ERROR),
      ],
    });
  }

  let valid;
  try {
    valid = await checkKey(userKey, discordId);
  } catch (err) {
    console.error(err);
    return interaction.editReply({
      embeds: [
        makeEmbed("❌ API Error", "Could not connect.", EmbedColor.ERROR),
      ],
    });
  }

  if (!valid) {
    return interaction.editReply({
      embeds: [
        makeEmbed(
          "❌ Invalid Key",
          "Please double-check and try again.",
          EmbedColor.ERROR,
        ),
      ],
    });
  }

  try {
    await member.roles.add(ROLE_ID);

    updateVerifyMessage(interaction.client).catch((err) =>
      console.error("[Stats] Failed to update stats panel:", err.message),
    );

    return interaction.editReply({
      embeds: [
        makeEmbed(
          "✅ Claim Key Success",
          "Your license has been successfully activated and the role has been granted.",
          EmbedColor.SUCCESS,
        ),
      ],
    });
  } catch (err) {
    console.error(err);
    return interaction.editReply({
      embeds: [
        makeEmbed("❌ Role Error", "Failed to assign role.", EmbedColor.ERROR),
      ],
    });
  }
}

async function handleResetModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const userKey = interaction.fields.getTextInputValue("user_key")?.trim();
  const discordId = interaction.user?.id;

  if (!userKey || !discordId) {
    return interaction.editReply({
      embeds: [
        makeEmbed(
          "❌ Incomplete Data",
          "Please fill in all fields.",
          EmbedColor.ERROR,
        ),
      ],
    });
  }

  try {
    await checkKeyReset(userKey, discordId);

    return interaction.editReply({
      embeds: [
        makeEmbed(
          "✅ Reset Successful",
          "Your HWID has been reset.",
          EmbedColor.SUCCESS,
        ),
      ],
    });
  } catch (err) {
    console.error(err);

    const errorMessages = {
      KEY_NOT_FOUND: "This key was not found in the system.",
      KEY_NOT_CLAIMED: "This key has not been claimed yet.",
      NOT_OWNER: "This key does not belong to you.",
      COOLDOWN_ACTIVE: formatCooldown(err.cooldown),
      MISSING_FIELDS: "Incomplete data. Please fill in all fields.",
    };

    const description =
      errorMessages[err.code] ?? err.message ?? "Please try again later.";

    return interaction.editReply({
      embeds: [makeEmbed("❌ Reset Failed", description, EmbedColor.ERROR)],
    });
  }
}

async function handleVoucherModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const days = parseInt(interaction.customId.replace("voucher_modal_", ""));
  const voucherUrl = interaction.fields
    .getTextInputValue("voucher_url")
    ?.trim();
  const discordId = interaction.user?.id;

  if (!voucherUrl || !discordId) {
    return interaction.editReply({
      embeds: [
        makeEmbed(
          "❌ ข้อมูลไม่ครบถ้วน",
          "กรุณาลองใหม่อีกครั้ง",
          EmbedColor.ERROR,
        ),
      ],
    });
  }

  const price =
    days === 1
      ? PRICE_1_DAY
      : days === 7
        ? PRICE_7_DAYS
        : days === 30
          ? PRICE_30_DAYS
          : PRICE_LIFETIME;

  const requiredSatang = price * 100;
  const durationLabel = days === 0 ? "Lifetime (ถาวร)" : `${days} วัน`;

  try {
    const redeemRes = await redeemRaw(ADMIN_PHONE, voucherUrl);

    if (!redeemRes.success) {
      return interaction.editReply({
        embeds: [
          makeEmbed(
            "❌ โอนเงินไม่สำเร็จ",
            redeemRes.message || "ซองอั่งเปาอาจหมดอายุหรือถูกเคลมไปแล้ว",
            EmbedColor.ERROR,
          ),
        ],
      });
    }

    if (redeemRes.amount < requiredSatang) {
      return interaction.editReply({
        embeds: [
          makeEmbed(
            "❌ ยอดเงินไม่ถูกต้อง",
            `คุณโอนซองอั่งเปามาจำนวน ${redeemRes.amount / 100} บาท แต่คีย์แบบ ${durationLabel} มีราคา ${price} บาท\n*(ระบบได้เคลมซองไปแล้วเนื่องจากไม่สามารถกู้คืนได้ โปรดติดต่อแอดมินเพื่อเคลมมือ)*`,
            EmbedColor.ERROR,
          ),
        ],
      });
    }

    const apiRes = await axios.post(`${API_URL}/licenses/claim-stock`, {
      discordId,
      expDays: days,
      secretToken: BOT_SECRET,
    });

    if (!apiRes.data.success) {
      return interaction.editReply({
        embeds: [
          makeEmbed(
            "❌ เกิดข้อผิดพลาด",
            apiRes.data.message || "เคลมคีย์ไม่สำเร็จ",
            EmbedColor.ERROR,
          ),
        ],
      });
    }

    const key = apiRes.data.key;

    let dmSent = false;
    try {
      await interaction.user.send({
        embeds: [
          makeEmbed(
            "🎉 ชำระเงินและรับคีย์สำเร็จ (Purchase Successful)",
            `ขอบคุณสำหรับการสั่งซื้อคีย์ใช้งานโปรแกรม!\n\n**รายละเอียดคีย์ของคุณ:**\n\`\`\`\n${key}\n\`\`\`\n*หมายเหตุ: คีย์นี้ได้ผูกมัดกับ Discord ID ของคุณอัตโนมัติแล้ว สามารถนำไปล็อคอินและเชื่อมต่อในโปรแกรมได้เลยทันที*`,
            EmbedColor.SUCCESS,
          ),
        ],
      });
      dmSent = true;
    } catch (err) {
      console.log(
        `[Voucher] Failed to send DM to ${interaction.user.tag}: ${err.message}`,
      );
    }

    sendTopupSuccess(interaction.client, {
      discordId,
      tag: interaction.user.tag,
      durationLabel,
      amount: redeemRes.amount,
      key,
      method: "truemoney", // ← เพิ่ม
    });

    try {
      const member = interaction.member;
      if (member && ROLE_ID) await member.roles.add(ROLE_ID);
    } catch (err) {
      console.error("[Voucher] Failed to assign role:", err);
    }

    updateVerifyMessage(interaction.client).catch((err) =>
      console.error("[Stats] Failed to update stats panel:", err.message),
    );

    const successDesc = dmSent
      ? `ซื้อคีย์แบบ **${durationLabel}** สำเร็จ!\nบอทได้ส่งรหัสคีย์เข้าไปยังข้อความส่วนตัว (DM) ของคุณเรียบร้อยแล้ว`
      : `ซื้อคีย์แบบ **${durationLabel}** สำเร็จ!\n\n⚠️ **เนื่องจากคุณปิดข้อความส่วนตัว (DM) บอทจึงแสดงคีย์ตรงนี้แทน:**\n\`\`\`\n${key}\n\`\`\`\n*โปรดคัดลอกรหัสนี้เก็บไว้ทันที (ข้อความนี้เห็นเฉพาะคุณคนเดียว)*`;

    return interaction.editReply({
      embeds: [makeEmbed("✅ สำเร็จ", successDesc, EmbedColor.SUCCESS)],
    });
  } catch (err) {
    console.error("❌ Voucher Redemption Error:", err);

    const apiErrorData = err.response?.data;
    if (apiErrorData?.code === "OUT_OF_STOCK") {
      return interaction.editReply({
        embeds: [
          makeEmbed(
            "⚠️ สินค้าหมดสต็อกชั่วคราว",
            `ระบบดึงเงินจากซองอั่งเปาจำนวน ${price} บาทสำเร็จแล้ว แต่คีย์ประเภท **${durationLabel}** ในคลังหมดสต็อกชั่วคราว\n\nโปรดเซฟรูปหน้านี้ติดต่อแอดมิน เพื่อทำรายการสร้างคีย์ส่งให้โดยตรงครับ`,
            EmbedColor.ERROR,
          ),
        ],
      });
    }

    const errorDetails =
      apiErrorData?.message ||
      err.message ||
      "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้";

    return interaction.editReply({
      embeds: [
        makeEmbed(
          "❌ เกิดข้อผิดพลาดของระบบ",
          `การเชื่อมต่อขัดข้อง (${errorDetails})\n\nโปรดนำรหัสซองอั่งเปาและรูปภาพติดต่อแอดมินเพื่อตรวจสอบและช่วยดูแลเคลมคีย์ให้แมนนวลครับ`,
          EmbedColor.ERROR,
        ),
      ],
    });
  }
}

function formatCooldown(cooldown) {
  if (!cooldown?.availableAt) return "Please wait before trying again.";
  const availableAt = new Date(cooldown.availableAt);
  const time = `<t:${Math.floor(availableAt.getTime() / 1000)}:R>`;
  return `Cooldown active — you can reset again ${time}`;
}

async function safeReplyError(interaction) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction
      .reply({ content: "❌ An error occurred.", ephemeral: true })
      .catch(() => {});
  }
}

module.exports = { onInteraction };
