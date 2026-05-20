const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const { ROLE_ID } = require("../config");
const { checkKey, checkKeyReset } = require("../services/keyService");
const { makeEmbed, EmbedColor } = require("../utils/embedBuilder");

/**
 * จัดการ interaction ทั้งหมด (Button + Modal)
 */
async function onInteraction(interaction) {
  try {
    if (interaction.isButton()) return handleButton(interaction);
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
      .setTitle("กรอก Key ของคุณ");

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

  // 👉 เพิ่ม reset button (ถ้ามีปุ่มนี้)
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
}

async function handleModal(interaction) {
  const { customId } = interaction;

  if (customId === "key_modal") {
    return handleKeyModal(interaction);
  }

  if (customId === "reset_modal") {
    return handleResetModal(interaction);
  }
}

// ---- Modal Handler ----

async function handleKeyModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const userKey = interaction.fields.getTextInputValue("user_key")?.trim();
  const discordId = interaction.user?.id;
  const member = interaction.member;

  if (!userKey || !discordId || !member) {
    return interaction.editReply({
      embeds: [
        makeEmbed("❌ ข้อมูลไม่ครบ", "ลองใหม่อีกครั้ง", EmbedColor.ERROR),
      ],
    });
  }

  if (member.roles.cache.has(ROLE_ID)) {
    return interaction.editReply({
      embeds: [
        makeEmbed("⚠️ มี Role แล้ว", "คุณใช้งานได้แล้ว", EmbedColor.WARNING),
      ],
    });
  }

  let valid;
  try {
    valid = await checkKey(userKey, discordId);
  } catch (err) {
    console.error(err);
    return interaction.editReply({
      embeds: [makeEmbed("❌ API Error", "เชื่อมต่อไม่ได้", EmbedColor.ERROR)],
    });
  }

  if (!valid) {
    return interaction.editReply({
      embeds: [
        makeEmbed("❌ Key ไม่ถูกต้อง", "ลองตรวจสอบอีกครั้ง", EmbedColor.ERROR),
      ],
    });
  }

  try {
    await member.roles.add(ROLE_ID);

    return interaction.editReply({
      embeds: [
        makeEmbed("✅ สำเร็จ", "ได้รับสิทธิ์แล้ว 🎉", EmbedColor.SUCCESS),
      ],
    });
  } catch (err) {
    console.error(err);
    return interaction.editReply({
      embeds: [
        makeEmbed("❌ Role Error", "เพิ่ม role ไม่สำเร็จ", EmbedColor.ERROR),
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
      embeds: [makeEmbed("❌ ข้อมูลไม่ครบ", "กรอกใหม่", EmbedColor.ERROR)],
    });
  }

  try {
    await checkKeyReset(userKey, discordId);

    return interaction.editReply({
      embeds: [
        makeEmbed("✅ Reset สำเร็จ", "HWID ถูกรีเซ็ตแล้ว", EmbedColor.SUCCESS),
      ],
    });

  } catch (err) {
    console.error(err);

    // Map error code → message
    const errorMessages = {
      KEY_NOT_FOUND:   "ไม่พบ Key นี้ในระบบ",
      KEY_NOT_CLAIMED: "Key นี้ยังไม่ได้ถูก Claim",
      NOT_OWNER:       "Key นี้ไม่ใช่ของคุณ",
      COOLDOWN_ACTIVE: formatCooldown(err.cooldown),
      MISSING_FIELDS:  "ข้อมูลไม่ครบ กรอกใหม่อีกครั้ง",
    };

    const description =
      errorMessages[err.code] ?? err.message ?? "ลองใหม่ภายหลัง";

    return interaction.editReply({
      embeds: [makeEmbed("❌ Reset ไม่สำเร็จ", description, EmbedColor.ERROR)],
    });
  }
}

function formatCooldown(cooldown) {
  if (!cooldown?.availableAt) return "กรุณารอก่อนใช้งานอีกครั้ง";

  const availableAt = new Date(cooldown.availableAt);
  const time = `<t:${Math.floor(availableAt.getTime() / 1000)}:R>`; // Discord timestamp

  return `Cooldown active — รีเซ็ตได้อีกครั้ง ${time}`;
}

// ---- Fallback Error Reply ----

async function safeReplyError(interaction) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction
      .reply({ content: "❌ เกิดข้อผิดพลาด", ephemeral: true })
      .catch(() => {});
  }
}

module.exports = { onInteraction };
