require('dotenv').config();

const { 
  Client, GatewayIntentBits, Partials, EmbedBuilder, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle, 
  ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const TOKEN = process.env.TOKEN;
const API_URL = process.env.API_URL;
const API_KEY_HEADER = process.env.API_KEY_HEADER;
const ROLE_ID = process.env.ROLE_ID;

const axios = require('axios');

const VERIFY_CHANNEL_ID = '1506665860528607273';

// ============================================================
// ส่งข้อความพร้อมปุ่มตอนบอทออนไลน์
// ============================================================
client.once('clientReady', async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(VERIFY_CHANNEL_ID);
    if (!channel) return console.error('❌ ไม่พบ channel');

    // ลบข้อความเก่าของบอทในห้องนี้ก่อน (optional)
    const messages = await channel.messages.fetch({ limit: 20 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    for (const msg of botMessages.values()) {
      await msg.delete().catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setTitle('🔑 ยืนยัน Key เพื่อรับสิทธิ์')
      .setDescription(
        'กดปุ่มด้านล่างเพื่อกรอก Key ของคุณ\nหากถูกต้อง ระบบจะให้ Role และเปิดห้องดาวน์โหลดโปรแกรมให้ทันที'
      )
      .setColor(0x5865F2)
      .setImage('https://img2.pic.in.th/Gemini_Generated_Image_g2vwsug2vwsug2vw-1.png')
      .setFooter({ text: 'Key ของคุณจะถูกเก็บเป็นความลับ' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_key_modal')
        .setLabel('กรอก Key')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔑')
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log('✅ ส่งข้อความ verify สำเร็จ');

  } catch (err) {
    console.error('❌ Error ส่งข้อความ:', err.message);
  }
});

// ============================================================
// ปุ่ม → เปิด Modal กรอก Key
// ============================================================
client.on('interactionCreate', async (interaction) => {

  // ---------- ปุ่ม ----------
  if (interaction.isButton() && interaction.customId === 'open_key_modal') {
    const modal = new ModalBuilder()
      .setCustomId('key_modal')
      .setTitle('กรอก Key ของคุณ');

    const keyInput = new TextInputBuilder()
      .setCustomId('user_key')
      .setLabel('Key')
      .setPlaceholder('xxxx-xxxx-xxxx-xxxx')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(4)
      .setMaxLength(100);

    modal.addComponents(new ActionRowBuilder().addComponents(keyInput));
    await interaction.showModal(modal);
    return;
  }

  // ---------- Modal Submit ----------
  if (interaction.isModalSubmit() && interaction.customId === 'key_modal') {
    await interaction.deferReply({ ephemeral: true });

    const userKey = interaction.fields.getTextInputValue('user_key').trim();
    const member  = interaction.member;

    // ตรวจสอบว่ามี role แล้วหรือยัง
    if (member.roles.cache.has(ROLE_ID)) {
      return interaction.editReply({
        embeds: [makeEmbed('⚠️ มี Role อยู่แล้ว', 'คุณได้รับสิทธิ์ไปแล้ว สามารถเข้าห้องดาวน์โหลดได้เลย!', 0xFEE75C)],
      });
    }

    // เรียก API ตรวจสอบ Key
    let valid = false;
    try {
      valid = await checkKeyWithAPI(userKey);
    } catch (err) {
      console.error('API Error:', err.message);
      return interaction.editReply({
        embeds: [makeEmbed('❌ เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง', 0xED4245)],
      });
    }

    if (!valid) {
      console.log(`[INVALID KEY] User: ${member.user.tag} | Key: ${userKey}`);
      return interaction.editReply({
        embeds: [makeEmbed('❌ Key ไม่ถูกต้อง', 'Key ที่กรอกไม่ถูกต้องหรือหมดอายุแล้ว\nกรุณาตรวจสอบและลองใหม่อีกครั้ง', 0xED4245)],
      });
    }

    // ให้ Role
    try {
      await member.roles.add(ROLE_ID);
      console.log(`[ROLE GIVEN] User: ${member.user.tag} | Key: ${userKey}`);

      return interaction.editReply({
        embeds: [makeEmbed(
          '✅ ยืนยันสำเร็จ!',
          'คุณได้รับสิทธิ์เรียบร้อยแล้ว 🎉\nตอนนี้คุณสามารถเข้าห้องดาวน์โหลดโปรแกรมได้แล้ว!',
          0x57F287
        )],
      });

    } catch (err) {
      console.error('Role Error:', err.message);
      return interaction.editReply({
        embeds: [makeEmbed('❌ ให้ Role ไม่สำเร็จ', 'เกิดข้อผิดพลาดในการให้ Role กรุณาแจ้ง Admin', 0xED4245)],
      });
    }
  }
});

// ============================================================
// ฟังก์ชันเช็ค Key กับ API
// ============================================================
async function checkKeyWithAPI(key) {
  try {
    const response = await axios.post(API_URL, 
      { key },
    );

    return response.data.success === true;

  } catch (err) {
    // axios throw error เมื่อ status 4xx/5xx
    if (err.response) {
      console.log(`[API] Status: ${err.response.status} | Key: ${key}`);
      return false; // 404 = ไม่มี key
    }
    throw err; // network error → โยนต่อให้ caller จัดการ
  }
}
// ============================================================
// Helper สร้าง Embed
// ============================================================
function makeEmbed(title, description, color) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

// ============================================================
// Login
// ============================================================
client.login(TOKEN);