const { makeEmbed, EmbedColor } = require("../utils/embedBuilder");
const { readQrCode } = require("../helper/readQrCode");
const { verifySlip } = require("../services/bankService");
const axios = require("axios");
const {
  BOT_SECRET,
  API_URL,
  ROLE_ID,
  ADMIN_ROLE_ID,
  PRICE_1_DAY,
  PRICE_7_DAYS,
  PRICE_30_DAYS,
  PRICE_LIFETIME,
} = require("../config");
const { sendTopupSuccess } = require("../services/notificationService");
const { updateVerifyMessage } = require("./readyHandler");

const processingChannels = new Set();

async function handleBankSlipMessage(message) {
  if (!message.channel.name?.startsWith("pay-")) return;
  if (message.author.bot) return;

  const imageAttachments = message.attachments.filter((a) =>
    a.contentType?.startsWith("image/"),
  );
  if (imageAttachments.size === 0) return;

  if (processingChannels.has(message.channel.id)) {
    return message.reply({
      embeds: [
        makeEmbed(
          "⏳ กำลังตรวจสอบสลิปก่อนหน้า",
          "กรุณารอให้ระบบตรวจสอบสลิปก่อนหน้าเสร็จสิ้นก่อน",
          EmbedColor.INFO,
        ),
      ],
    });
  }

  processingChannels.add(message.channel.id);

  const processingMsg = await message.channel.send({
    embeds: [
      makeEmbed(
        "⏳ Reading Qr Code...",
        `Found ${imageAttachments.size} image checking....`,
        EmbedColor.INFO,
      ),
    ],
  });

  try {
    // ─── Step 1: Loop อ่าน QR จากรูปทั้งหมด ───────────────────────────
    let payload = null;

    for (const [, attachment] of imageAttachments) {
      console.log(`[BankSlip] Trying QR on: ${attachment.url}`);
      payload = await readQrCode(attachment.url);
      if (payload) {
        console.log(`[BankSlip] QR payload found: ${payload}`);
        break;
      }
    }

    if (!payload) {
      await processingMsg.edit({
        embeds: [
          makeEmbed(
            "❌ Can't Reading Slip",
            "ไม่พบ QR Code ในสลิป กรุณาส่งภาพที่ชัดเจนขึ้น หรือถ่ายตรงๆ ไม่บิดเอียง",
            EmbedColor.ERROR,
          ),
        ],
      });
      return;
    }

    // ─── Step 2: ยืนยันสลิปกับ EasySlip ───────────────────────────────
    await processingMsg.edit({
      embeds: [
        makeEmbed(
          "🔍 Waiting Verify Slip...",
          "Verifying slip information...",
          EmbedColor.INFO,
        ),
      ],
    });

    const result = await verifySlip(payload);

    // ── EasySlip ปฏิเสธ ────────────────────────────────────────────────
    if (!result?.success) {
      await processingMsg.edit({
        embeds: [
          makeEmbed(
            "❌ สลิปไม่ผ่านการตรวจสอบ",
            [
              `**สาเหตุ:** ${result?.message ?? "ไม่ทราบสาเหตุ"}`,
              ``,
              `*หากเชื่อว่าสลิปถูกต้อง โปรดแจ้ง <@&${ADMIN_ROLE_ID}>*`,
            ].join("\n"),
            EmbedColor.ERROR,
          ),
        ],
      });
      return;
    }

    // ─── Step 3: ดึงข้อมูลจาก rawSlip ─────────────────────────────────
    const rawSlip = result.data?.rawSlip;
    const transferredBaht = rawSlip?.amount?.amount ?? 0; // หน่วยเป็นบาทแล้ว
    const senderName = rawSlip?.sender?.account?.name?.th ?? "-";
    const receiverName = rawSlip?.receiver?.account?.name?.th ?? "-";
    const senderBank = rawSlip?.sender?.bank?.name ?? "-";
    const receiverBank = rawSlip?.receiver?.bank?.name ?? "-";
    const transRef = rawSlip?.transRef ?? "-";
    const date = rawSlip?.date
      ? new Date(rawSlip.date).toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        })
      : "-";

    // ─── Step 4: เช็คว่ายอดตรงกับ package ไหน ─────────────────────────
    const packageMatch = resolvePackageByAmount(transferredBaht);

    if (!packageMatch) {
      await processingMsg.edit({
        embeds: [
          makeEmbed(
            "⚠️ ยอดโอนไม่ตรงกับแพ็กเกจใด",
            [
              `**ยอดที่โอนมา:** ${transferredBaht} บาท`,
              ``,
              `ราคาแพ็กเกจที่มี:`,
              `• 1 วัน = ${PRICE_1_DAY} บาท`,
              `• 7 วัน = ${PRICE_7_DAYS} บาท`,
              `• 30 วัน = ${PRICE_30_DAYS} บาท`,
              `• Lifetime = ${PRICE_LIFETIME} บาท`,
              ``,
              `*หากจำนวนเงินถูกต้อง โปรดแจ้ง <@&${ADMIN_ROLE_ID}>*`,
            ].join("\n"),
            EmbedColor.ERROR,
          ),
        ],
      });
      return;
    }

    const { days, durationLabel } = packageMatch;

    // ─── Step 5: แสดงผลสำเร็จ ──────────────────────────────────────────
    await processingMsg.edit({
      embeds: [
        makeEmbed(
          "✅ ยืนยันสลิปสำเร็จ",
          [
            "```",
            `[ 👤 ผู้โอน  ] ${senderName} (${senderBank})`,
            `[ 🏦 ผู้รับ  ] ${receiverName} (${receiverBank})`,
            `[ 💰 จำนวน  ] ${transferredBaht} บาท`,
            `[ 📅 วันที่  ] ${date}`,
            `[ 🔖 Ref.   ] ${transRef}`,
            "```",
            ``,
            `⏳ กำลังออกคีย์แบบ **${durationLabel}** ให้อัตโนมัติ...`,
          ].join("\n"),
          EmbedColor.SUCCESS,
        ),
      ],
    });

    // ─── Step 6: เคลมคีย์จาก API ────────────────────────────────────────
    const discordId = message.author.id;

    const apiRes = await axios.post(`${API_URL}/licenses/claim-stock`, {
      discordId,
      expDays: days,
      secretToken: BOT_SECRET,
    });

    if (!apiRes.data.success) {
      await message.channel.send({
        embeds: [
          makeEmbed(
            "❌ ออกคีย์ไม่สำเร็จ",
            apiRes.data.message || "คลังคีย์อาจหมด โปรดติดต่อแอดมิน",
            EmbedColor.ERROR,
          ),
        ],
      });
      return;
    }

    const key = apiRes.data.key;

    // ─── Step 7: ส่งคีย์ทาง DM ──────────────────────────────────────────
    let dmSent = false;
    try {
      await message.author.send({
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
        `[BankSlip] Failed to send DM to ${message.author.tag}: ${err.message}`,
      );
    }

    // ─── Step 8: Assign Role ─────────────────────────────────────────────
    try {
      if (ROLE_ID) await message.member.roles.add(ROLE_ID);
    } catch (err) {
      console.error("[BankSlip] Failed to assign role:", err);
    }

    // ─── Step 9: Notify + Update stats ──────────────────────────────────
    sendTopupSuccess(message.client, {
      discordId,
      tag: message.author.tag,
      durationLabel,
      amount: transferredBaht * 100, // sendTopupSuccess รับ satang
      key,
      method: "bank", // ← เพิ่ม
      senderName: senderName, // ← เพิ่ม (มีอยู่แล้วใน scope)
      senderBank: senderBank, // ← เพิ่ม
      receiverBank: receiverBank, // ← เพิ่ม
      transRef: transRef, // ← เพิ่ม
    });

    updateVerifyMessage(message.client).catch((err) =>
      console.error("[Stats] Failed to update stats panel:", err.message),
    );

    // ─── Step 10: แจ้งผลในห้อง ──────────────────────────────────────────
    const successDesc = dmSent
      ? `ซื้อคีย์แบบ **${durationLabel}** สำเร็จ!\nบอทส่งคีย์ไปยัง DM ของคุณแล้ว ✉️`
      : `ซื้อคีย์แบบ **${durationLabel}** สำเร็จ!\n\n⚠️ **DM ปิดอยู่ คีย์ของคุณ (เห็นเฉพาะคุณ):**\n\`\`\`\n${key}\n\`\`\`\n*คัดลอกเก็บไว้ด่วน!*`;

    await message.channel.send({
      content: `<@${discordId}>`,
      embeds: [makeEmbed("✅ เสร็จสิ้น", successDesc, EmbedColor.SUCCESS)],
    });

    await message.channel.send({
      embeds: [
        makeEmbed(
          "🗑️ Closing Channel",
          "This channel will be deleted automatically in 5 seconds.",
          EmbedColor.INFO,
        ),
      ],
    });

    setTimeout(async () => {
      try {
        await message.channel.delete("Payment completed");
      } catch (err) {
        console.error("[BankSlip] Failed to delete channel:", err);
      }
    }, 5000);
  } catch (err) {
    console.error("[BankSlip] Unexpected error:", err);
    await processingMsg.edit({
      embeds: [
        makeEmbed(
          "❌ เกิดข้อผิดพลาดของระบบ",
          `${err.message ?? "Unknown error"}\n\nโปรดติดต่อแอดมิน`,
          EmbedColor.ERROR,
        ),
      ],
    });
  } finally {
    processingChannels.delete(message.channel.id);
  }
}

function resolvePackageByAmount(baht) {
  const map = [
    { price: PRICE_1_DAY, days: 1, durationLabel: "1 วัน" },
    { price: PRICE_7_DAYS, days: 7, durationLabel: "7 วัน" },
    { price: PRICE_30_DAYS, days: 30, durationLabel: "30 วัน" },
    { price: PRICE_LIFETIME, days: 0, durationLabel: "Lifetime (ถาวร)" },
  ];
  return map.find((p) => p.price === baht) ?? null;
}

module.exports = { handleBankSlipMessage };
