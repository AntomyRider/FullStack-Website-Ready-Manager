const prisma = require("../lib/prisma.js");

function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 5; j++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }

    if (i !== 3) key += "-";
  }

  return key;
}

const ERROR_CODES = {
  MISSING_FIELDS:   "MISSING_FIELDS",
  KEY_NOT_FOUND:    "KEY_NOT_FOUND",
  KEY_NOT_CLAIMED:  "KEY_NOT_CLAIMED",
  NOT_OWNER:        "NOT_OWNER",
  COOLDOWN_ACTIVE:  "COOLDOWN_ACTIVE",
};

const ONE_DAY = 24 * 60 * 60 * 1000;

exports.createKey = async (req, res) => {
  try {
    const amount = parseInt(req.body.amount) || 1;
    const expDays = parseInt(req.body.exp) || 0;

    const expireAt =
      expDays > 0 ? new Date(Date.now() + expDays * 24 * 60 * 60 * 1000) : null;

    const keys = Array.from({ length: amount }).map(() => generateKey());

    await prisma.licence.createMany({
      data: keys.map((key) => ({
        key,
        status: "Enable",
        expDays,
        activatedAt: null,
        expireAt: null,
      })),
    });

    return res.status(200).json({
      success: true,
      amount: keys.length,
      exp: expDays,
      expireAt,
      keys,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.listKey = async (req, res) => {
  try {
    const licences = await prisma.licence.findMany();

    return res.status(200).json(licences);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteKey = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.licence.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: "Key deleted",
      data: deleted,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.activateKey = async (req, res) => {
  try {
    const { key, hwid } = req.body;

    if (!key || !hwid) {
      return res.status(400).json({
        success: false,
        message: "Key and HWID are required",
      });
    }

    const licence = await prisma.licence.findUnique({
      where: { key },
    });

    if (!licence) {
      return res.status(404).json({ success: false, message: "Invalid key" });
    }

    if (licence.status !== "Enable") {
      return res
        .status(403)
        .json({ success: false, message: "Licence inactive" });
    }

    if (licence.expireAt && licence.expireAt < new Date()) {
      return res
        .status(403)
        .json({ success: false, message: "Licence expired" });
    }

    if (licence.hwid && licence.hwid !== hwid) {
      return res.status(403).json({ success: false, message: "HWID mismatch" });
    }

    const now = new Date();

    if (!licence.hwid) {
      // first activation — update licence
      await prisma.licence.update({
        where: { key },
        data: {
          hwid,
          activatedAt: now,
          expireAt:
            licence.expDays > 0
              ? new Date(now.getTime() + licence.expDays * 24 * 60 * 60 * 1000)
              : null,
        },
      });
    }

    // ✅ เพิ่มบรรทัดนี้ — บันทึกทุกครั้งที่มีการ activate (ทั้ง first และ re-use)
    await prisma.historyKeyActivated.create({
      data: {
        licenceId: licence.id,
        activatedAt: now,
      },
    });

    return res.status(200).json({ success: true, message: "Activated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const totalKeys = await prisma.licence.count();
    const enableKeys = await prisma.licence.count({
      where: { status: "Enable" },
    });
    const disableKeys = await prisma.licence.count({
      where: { status: "Disable" },
    });
    const activatedKeys = await prisma.licence.count({
      where: { hwid: { not: null } },
    });
    const expiredKeys = await prisma.licence.count({
      where: {
        AND: [{ expireAt: { not: null } }, { expireAt: { lt: new Date() } }],
      },
    });
    const unusedKeys = await prisma.licence.count({ where: { hwid: null } });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentKeys = await prisma.licence.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        key: true,
        hwid: true,
        status: true,
        createdAt: true,
        activatedAt: true,
        expireAt: true,
      },
    });

    const latestKeys = await prisma.licence.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        key: true,
        hwid: true,
        status: true,
        expireAt: true,
        activatedAt: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalKeys,
        enableKeys,
        disableKeys,
        activatedKeys,
        expiredKeys,
        unusedKeys,
        recentKeys,
        latestKeys,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetKey = async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res
        .status(400)
        .json({ success: false, message: "Key is required" });
    }

    const licence = await prisma.licence.findUnique({ where: { key } });

    if (!licence) {
      return res
        .status(404)
        .json({ success: false, message: "Licence not found" });
    }

    await prisma.licence.update({
      where: { key },
      data: {
        hwid: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "HWID reset successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "ID is required" });
    }

    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }

    const update = await prisma.licence.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    return res.status(200).json({
      success: true,
      message: "Key updated",
      data: update,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAllKeys = async (req, res) => {
  try {
    await prisma.historyKeyActivated.deleteMany({});
    const deleted = await prisma.licence.deleteMany();

    return res.status(200).json({
      success: true,
      message: `License ${deleted.key} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting license:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.claimKey = async (req, res) => {
  try {
    const { key, discordId } = req.body;

    if (!key || !discordId) {
      return res.status(400).json({
        success: false,
        message: "key or discordId missing",
      });
    }

    const licence = await prisma.licence.findUnique({
      where: { key },
    });

    if (!licence) {
      return res.status(404).json({
        success: false,
        message: "Key not found",
      });
    }

    // เช็คว่าเคย claim แล้วหรือยัง
    const existingClaim = await prisma.claim.findFirst({
      where: {
        key,
      },
    });

    if (existingClaim) {
      return res.status(409).json({
        success: false,
        message: "Key already claimed",
      });
    }

    // สร้าง claim
    await prisma.claim.create({
      data: {
        key,
        discordId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Key claimed successfully",
    });
  } catch (error) {
    console.error("Error checking license:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



// Error codes constants


exports.resetHwid = async (req, res) => {
  try {
    const { key, discordId } = req.body;

    if (!key || !discordId) {
      return res.status(400).json({
        success: false,
        code:    ERROR_CODES.MISSING_FIELDS,
        message: "Missing required fields: key and discordId are required",
      });
    }

    const licence = await prisma.licence.findUnique({ where: { key } });

    if (!licence) {
      return res.status(404).json({
        success: false,
        code:    ERROR_CODES.KEY_NOT_FOUND,
        message: `Key not found: "${key}" does not exist in the system`,
      });
    }

    const claim = await prisma.claim.findFirst({ where: { key } });

    if (!claim) {
      return res.status(403).json({
        success: false,
        code:    ERROR_CODES.KEY_NOT_CLAIMED,
        message: "Key has not been claimed yet — please claim this key before resetting HWID",
      });
    }

    if (claim.discordId !== discordId) {
      return res.status(403).json({
        success: false,
        code:    ERROR_CODES.NOT_OWNER,
        message: `Not owner — this key belongs to a different Discord account`,
      });
    }

    if (licence.resetCooldownAt) {
      const diff      = Date.now() - new Date(licence.resetCooldownAt).getTime();
      const remaining = ONE_DAY - diff;

      if (remaining > 0) {
        const hoursLeft   = Math.floor(remaining / 3600000);
        const minutesLeft = Math.ceil((remaining % 3600000) / 60000);

        return res.status(429).json({
          success:          false,
          code:             ERROR_CODES.COOLDOWN_ACTIVE,
          message:          `Cooldown active — please wait ${hoursLeft}h ${minutesLeft}m before resetting again`,
          cooldown: {
            remainingMs:    remaining,
            availableAt:    new Date(new Date(licence.resetCooldownAt).getTime() + ONE_DAY),
          },
        });
      }
    }

    await prisma.licence.update({
      where: { key },
      data:  {
        hwid:            null,
        resetAt:         new Date(),
        resetCooldownAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "HWID reset successfully",
    });

  } catch (error) {
    console.error("Error resetting HWID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};