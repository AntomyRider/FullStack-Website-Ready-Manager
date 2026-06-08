const { handleButton } = require("./interactions/buttonHandler");
const { handleSelectMenu } = require("./interactions/selectMenuHandler");
const { handleModal } = require("./interactions/modalHandler");

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

async function safeReplyError(interaction) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction
      .reply({ content: "❌ An error occurred.", ephemeral: true })
      .catch(() => {});
  }
}

module.exports = { onInteraction };
