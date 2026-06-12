const { handleButton } = require("./interactions/buttonHandler");
const { handleSelectMenu } = require("./interactions/selectMenuHandler");
const { handleModal } = require("./interactions/modalHandler");

async function onInteraction(interaction) {
  try {
    const userId = interaction.user.id;
    const username = interaction.user.tag;
    let detail = "";
    if (interaction.isButton()) detail = `Button [${interaction.customId}]`;
    else if (interaction.isStringSelectMenu()) detail = `SelectMenu [${interaction.customId}] (Value: ${interaction.values.join(", ")})`;
    else if (interaction.isModalSubmit()) detail = `Modal [${interaction.customId}]`;

    if (detail) {
      console.log(`[Interaction] ${new Date().toISOString()} - User: ${username} (${userId}) - Action: ${detail}`);
    }

    if (interaction.isButton()) return await handleButton(interaction);
    if (interaction.isStringSelectMenu()) return await handleSelectMenu(interaction);
    if (interaction.isModalSubmit()) return await handleModal(interaction);
  } catch (err) {
    console.error("❌ Interaction Error:", err);
    await safeReplyError(interaction);
  }
}

async function safeReplyError(interaction) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction
      .reply({ content: "❌ An error occurred.", ephemeral: true })
      .catch(() => {});
  }
}

module.exports = { onInteraction };
