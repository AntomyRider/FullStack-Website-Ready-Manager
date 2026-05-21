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

    const license = await prisma.license.findUnique({
      where: { key },
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "Invalid license",
      });
    }

    if (license.status !== StatusKey.Enable) {
      return res.status(403).json({
        success: false,
        message: "License inactive",
      });
    }

    if (license.expireAt && license.expireAt < new Date()) {
      return res.status(403).json({
        success: false,
        message: "License expired",
      });
    }

    if (!license.activatedAt || !license.hwid) {
      return res.status(403).json({
        success: false,
        message: "HWID not bound",
      });
    }

    if (license.hwid !== hwid) {
      return res.status(403).json({
        success: false,
        message: "HWID mismatch",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verified",
      data: {
        key: license.key,
        hwid: license.hwid,
        status: license.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
