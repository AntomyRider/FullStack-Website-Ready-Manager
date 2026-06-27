const prisma = require("../lib/prisma.js");
const axios = require("axios");

// Get configuration (Accessed by Admin or Bot)
exports.getBotConfig = async (req, res) => {
  try {
    let config = await prisma.botConfig.findUnique({
      where: { id: 1 }
    });

    // If somehow not found, create a default one
    if (!config) {
      config = await prisma.botConfig.create({
        data: {
          id: 1,
          price1Day: 19,
          price7Days: 69,
          price30Days: 169,
          priceLifetime: 199,
          embedImageUrl: "https://img2.pic.in.th/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f776174747061642d6d656469612d736572766963652f53746f7279496d6167652f412d77586c7a2d354458414c76413d3d2d313134363638353832352e3136623139303963393361393730.gif",
          embedTitle: "READY MANAGER : โปรแกรมช่วยโพสต์",
          embedDescription: "**<:ReadyIcon:1506734243898855505> READY MANAGER : โปรแกรมช่วยโพสต์**\n\n```\n⚠️ WARNING\n- กรุณาสร้างซองอั่งเปาให้มียอดเงินเพียงพอต่อราคาคีย์ที่ต้องการซื้อ\n- หากเติมเงินเกินจากราคาคีย์ ระบบจะไม่คืนส่วนต่างทุกกรณี\n```",
          bankName: "กรุงไทย",
          bankHolder: "นครินทร์ งานยางหวาย",
          bankAccount: "4280686564",
          adminPhone: "0832584267",
          verifyChannelId: "1506243441007398964",
          logChannelId: "1512868304891412572"
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error("❌ Error in getBotConfig:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update configuration (Admin only)
exports.updateBotConfig = async (req, res) => {
  try {
    const {
      price1Day,
      price7Days,
      price30Days,
      priceLifetime,
      embedImageUrl,
      embedTitle,
      embedDescription,
      bankName,
      bankHolder,
      bankAccount,
      adminPhone,
      verifyChannelId,
      logChannelId
    } = req.body;

    const config = await prisma.botConfig.upsert({
      where: { id: 1 },
      update: {
        price1Day: parseInt(price1Day) || 19,
        price7Days: parseInt(price7Days) || 69,
        price30Days: parseInt(price30Days) || 169,
        priceLifetime: parseInt(priceLifetime) || 199,
        embedImageUrl: embedImageUrl || "",
        embedTitle: embedTitle || "READY MANAGER : โปรแกรมช่วยโพสต์",
        embedDescription: embedDescription || "",
        bankName: bankName || "กรุงไทย",
        bankHolder: bankHolder || "นครินทร์ งานยางหวาย",
        bankAccount: bankAccount || "4280686564",
        adminPhone: adminPhone || "0832584267",
        verifyChannelId: verifyChannelId || "1506243441007398964",
        logChannelId: logChannelId || "1512868304891412572"
      },
      create: {
        id: 1,
        price1Day: parseInt(price1Day) || 19,
        price7Days: parseInt(price7Days) || 69,
        price30Days: parseInt(price30Days) || 169,
        priceLifetime: parseInt(priceLifetime) || 199,
        embedImageUrl: embedImageUrl || "",
        embedTitle: embedTitle || "READY MANAGER : โปรแกรมช่วยโพสต์",
        embedDescription: embedDescription || "",
        bankName: bankName || "กรุงไทย",
        bankHolder: bankHolder || "นครินทร์ งานยางหวาย",
        bankAccount: bankAccount || "4280686564",
        adminPhone: adminPhone || "0832584267",
        verifyChannelId: verifyChannelId || "1506243441007398964",
        logChannelId: logChannelId || "1512868304891412572"
      }
    });

    // Notify the Bot to update its Embed immediately
    // The Bot runs inside the docker network on container name 'bot' port 3005
    // In dev on Windows, it runs on localhost:3005. Let's resolve the bot URL.
    let botUrl = "http://bot:3005/update-panel";
    if (process.platform === "win32") {
      botUrl = "http://localhost:3005/update-panel";
    }

    try {
      await axios.post(botUrl, {}, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_SECRET || "READY_MANAGER_BOT_SECRET_2026"}`
        },
        timeout: 3000 // timeout in case bot is not running
      });
      console.log("🔔 Bot panel refresh triggered successfully!");
    } catch (botErr) {
      console.warn("⚠️ Failed to trigger Bot panel update (Bot might be offline):", botErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Configuration updated successfully",
      data: config
    });
  } catch (error) {
    console.error("❌ Error in getBotConfig:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
