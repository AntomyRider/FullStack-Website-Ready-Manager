const prisma = require("../lib/prisma.js");

exports.getUserById = async (req, res) => {
  try {
    const { key } = req.params;

    const user = await prisma.licence.findUnique({
      where: {
        key
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};