const prisma = require("../lib/prisma.js");

exports.getHistory = async (req, res) => {
  try {
    const history = await prisma.historyKeyActivated.findMany({
      orderBy: { activatedAt: "desc" },
      select: {
        id: true,
        activatedAt: true,
        licenseId: true,
      },
    });

    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};