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
 * Handle all interactions (Button + Modal)
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

  // 👉 Reset button handler
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
      embeds: [makeEmbed("❌ API Error", "Could not connect.", EmbedColor.ERROR)],
    });
  }

  if (!valid) {
    return interaction.editReply({
      embeds: [
        makeEmbed("❌ Invalid Key", "Please double-check and try again.", EmbedColor.ERROR),
      ],
    });
  }

  try {
    await member.roles.add(ROLE_ID);

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
      embeds: [makeEmbed("❌ Incomplete Data", "Please fill in all fields.", EmbedColor.ERROR)],
    });
  }

  try {
    await checkKeyReset(userKey, discordId);

    return interaction.editReply({
      embeds: [
        makeEmbed("✅ Reset Successful", "Your HWID has been reset.", EmbedColor.SUCCESS),
      ],
    });
  } catch (err) {
    console.error(err);

    // Map error code → message
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

function formatCooldown(cooldown) {
  if (!cooldown?.availableAt) return "Please wait before trying again.";

  const availableAt = new Date(cooldown.availableAt);
  const time = `<t:${Math.floor(availableAt.getTime() / 1000)}:R>`; // Discord timestamp

  return `Cooldown active — you can reset again ${time}`;
}

// ---- Fallback Error Reply ----

async function safeReplyError(interaction) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction
      .reply({ content: "❌ An error occurred.", ephemeral: true })
      .catch(() => {});
  }
}

module.exports = { onInteraction };