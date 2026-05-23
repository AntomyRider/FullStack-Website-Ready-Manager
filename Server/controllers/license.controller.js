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

    await prisma.license.createMany({
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
    const [licenses, claims] = await Promise.all([
      prisma.license.findMany(),
      prisma.claim.findMany(),
    ]);

    // Build a map of key → discordId for O(1) lookup
    const claimMap = new Map(claims.map((c) => [c.key, c.discordId]));

    const result = licenses
      // Keys without HWID (unactivated) come first
      .sort((a, b) => {
        if (!a.hwid && b.hwid) return -1;
        if (a.hwid && !b.hwid) return 1;
        return 0;
      })
      .map((license) => ({
        ...license,
        discordId: claimMap.get(license.key) ?? null,
      }));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteKey = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    // ✅ ลบ related records ก่อนเสมอ
    await prisma.historyKeyActivated.deleteMany({
      where: { licenseId: parseInt(id) },
    });

    await prisma.claim.deleteMany({
      where: { key: (await prisma.license.findUnique({ 
        where: { id: parseInt(id) }, 
        select: { key: true } 
      }))?.key },
    });

    const deleted = await prisma.license.delete({
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

    const license = await prisma.license.findUnique({
      where: { key },
    });

    if (!license) {
      return res.status(404).json({ success: false, message: "Invalid key" });
    }

    if (license.status !== "Enable") {
      return res
        .status(403)
        .json({ success: false, message: "License inactive" });
    }

    if (license.expireAt && license.expireAt < new Date()) {
      return res
        .status(403)
        .json({ success: false, message: "License expired" });
    }

    if (license.hwid && license.hwid !== hwid) {
      return res.status(403).json({ success: false, message: "HWID mismatch" });
    }

    const now = new Date();

    if (!license.hwid) {
      // first activation — update license
      await prisma.license.update({
        where: { key },
        data: {
          hwid,
          usedBy:      "Activated",
          activatedAt: now,
          expireAt:
            license.expDays > 0
              ? new Date(now.getTime() + license.expDays * 24 * 60 * 60 * 1000)
              : null,
        },
      });
    }

    // ✅ เพิ่มบรรทัดนี้ — บันทึกทุกครั้งที่มีการ activate (ทั้ง first และ re-use)
    await prisma.historyKeyActivated.create({
      data: {
        licenseId: license.id,
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
    const totalKeys = await prisma.license.count();
    const enableKeys = await prisma.license.count({
      where: { status: "Enable" },
    });
    const disableKeys = await prisma.license.count({
      where: { status: "Disable" },
    });
    const activatedKeys = await prisma.license.count({
      where: { hwid: { not: null } },
    });
    const expiredKeys = await prisma.license.count({
      where: {
        AND: [{ expireAt: { not: null } }, { expireAt: { lt: new Date() } }],
      },
    });
    const unusedKeys = await prisma.license.count({ where: { hwid: null } });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentKeys = await prisma.license.findMany({
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

    const latestKeys = await prisma.license.findMany({
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

    const license = await prisma.license.findUnique({ where: { key } });

    if (!license) {
      return res
        .status(404)
        .json({ success: false, message: "License not found" });
    }

    await prisma.license.update({
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

    const update = await prisma.license.update({
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
    const deleted = await prisma.license.deleteMany();

    return res.status(200).json({
      success: true,
      message: `${deleted.count} licenses deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting licenses:", error);
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

    const license = await prisma.license.findUnique({
      where: { key },
    });

    if (!license) {
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

    const license = await prisma.license.findUnique({ where: { key } });

    if (!license) {
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

    if (license.resetCooldownAt) {
      const diff      = Date.now() - new Date(license.resetCooldownAt).getTime();
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
            availableAt:    new Date(new Date(license.resetCooldownAt).getTime() + ONE_DAY),
          },
        });
      }
    }

    await prisma.license.update({
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

exports.redeemKey = async (req, res) => {
  try {
    const { key, redeemCode } = req.body;

    if (!key || !redeemCode) {
      return res.status(400).json({
        success: false,
        message: "key and redeemCode are required",
      });
    }

    if (key === redeemCode) {
      return res.status(400).json({
        success: false,
        message: "Cannot redeem your own key",
      });
    }

    // หา activated key (unique — หาตรงๆ เลย)
    const activatedLicense = await prisma.license.findUnique({
      where: { key },
    });

    if (!activatedLicense) {
      return res.status(404).json({
        success: false,
        message: "License not found",
      });
    }

    if (!activatedLicense.hwid) {
      return res.status(403).json({
        success: false,
        message: "This key has not been activated yet",
      });
    }

    // หา redeem code
    const redeemLicense = await prisma.license.findUnique({
      where: { key: redeemCode },
    });

    if (!redeemLicense) {
      return res.status(404).json({
        success: false,
        message: "Redeem code not found",
      });
    }

    if (redeemLicense.usedBy === "Redeemed") {
      return res.status(403).json({
        success: false,
        message: "This redeem code has already been used",
      });
    }

    if (redeemLicense.status !== "Enable") {
      return res.status(403).json({
        success: false,
        message: "This redeem code is disabled",
      });
    }

    if (redeemLicense.hwid) {
      return res.status(403).json({
        success: false,
        message: "This redeem code is already activated",
      });
    }

    // คำนวณ expireAt ใหม่
    const baseDate =
      activatedLicense.expireAt && activatedLicense.expireAt > new Date()
        ? activatedLicense.expireAt  // ต่อจากวันหมดอายุเดิม
        : new Date();                // ถ้าหมดแล้วนับจากวันนี้

    const newExpireAt = new Date(
      baseDate.getTime() + redeemLicense.expDays * 24 * 60 * 60 * 1000
    );

    // ต่อเวลา key หลัก
    const updated = await prisma.license.update({
      where: { key },
      data: {
        expDays:  activatedLicense.expDays + redeemLicense.expDays,
        expireAt: newExpireAt,
      },
    });

    await prisma.license.update({
      where: { key: redeemCode },
      data: {
        status:      "Disable",
        usedBy:      "Redeemed",
        hwid:        activatedLicense.hwid,
        activatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Extended by ${redeemLicense.expDays} days`,
      data: {
        key:      updated.key,
        expDays:  updated.expDays,
        expireAt: updated.expireAt,
      },
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};