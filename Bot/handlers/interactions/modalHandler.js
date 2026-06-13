const axios = require("axios");
const config = require("../../config");
const {
  ROLE_ID,
  ADMIN_PHONE,
  BOT_SECRET,
  API_URL,
} = config;
const { checkKey, checkKeyReset } = require("../../services/keyService");
const { redeemRaw } = require("../../services/voucherService");
const { makeEmbed, EmbedColor } = require("../../utils/embedBuilder");
const { updateVerifyMessage } = require("../readyHandler");
const { sendTopupSuccess } = require("../../services/notificationService");

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
      ? config.PRICE_1_DAY
      : days === 7
        ? config.PRICE_7_DAYS
        : days === 30
          ? config.PRICE_30_DAYS
          : config.PRICE_LIFETIME;

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
      amount: redeemRes.amount / 100, // Pass amount in THB
      paymentMethod: "truemoney",
      transRef: voucherUrl, // Pass the voucher URL as the unique transaction ref
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
      method: "truemoney",
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

    if (apiErrorData?.code === "DUPLICATE_VOUCHER") {
      return interaction.editReply({
        embeds: [
          makeEmbed(
            "❌ ซองอั่งเปานี้เคยถูกเคลมไปแล้ว",
            `ซองอั่งเปานี้เคยถูกใช้งานเพื่อรับคีย์ในระบบไปแล้ว ไม่สามารถเคลมซ้ำได้อีก`,
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

module.exports = { handleModal };
