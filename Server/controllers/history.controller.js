const prisma = require("../lib/prisma.js");

exports.getHistory = async (req, res) => {
  try {
    const history = await prisma.historyKeyActivated.findMany({
      include: { licence: true },
      orderBy: {activatedAt: "desc",},
    });
    return res.status(200).json(history);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
