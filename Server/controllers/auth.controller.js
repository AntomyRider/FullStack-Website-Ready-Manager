const prisma = require("../lib/prisma.js");
const { StatusKey } = require("@prisma/client");

exports.verify = async (req, res) => {
  try {
    const { key, hwid } = req.body;

    if (!key || !hwid) {
      return res.status(400).json({
        success: false,
        message: "Missing key or hwid",
      });
    }

    const licence = await prisma.licence.findUnique({
      where: { key },
    });

    if (!licence) {
      return res.status(404).json({
        success: false,
        message: "Invalid licence",
      });
    }

    if (licence.status !== StatusKey.Enable) {
      return res.status(403).json({
        success: false,
        message: "Licence inactive",
      });
    }

    if (licence.expireAt && licence.expireAt < new Date()) {
      return res.status(403).json({
        success: false,
        message: "Licence expired",
      });
    }

    if (!licence.activatedAt || !licence.hwid) {
      return res.status(403).json({
        success: false,
        message: "HWID not bound",
      });
    }

    if (licence.hwid !== hwid) {
      return res.status(403).json({
        success: false,
        message: "HWID mismatch",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verified",
      data: {
        key: licence.key,
        hwid: licence.hwid,
        status: licence.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
