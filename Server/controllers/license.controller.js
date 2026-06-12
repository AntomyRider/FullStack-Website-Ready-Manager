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

    const formatDuration = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      if (minutes > 0) return `${minutes}m`;
      return `${seconds}s`;
    };

    const result = licenses
      // Keys without HWID (unactivated) come first
      .sort((a, b) => {
        if (!a.hwid && b.hwid) return -1;
        if (a.hwid && !b.hwid) return 1;
        return 0;
      })
      .map((license) => {
        const now = new Date();
        const isOnline = (license.currentSessionStartAt && license.lastHeartbeatAt)
          ? (now.getTime() - new Date(license.lastHeartbeatAt).getTime() <= 7 * 60 * 1000)
          : false;

        let durationText = "-";
        if (isOnline) {
          const sessionStart = license.currentSessionStartAt ? new Date(license.currentSessionStartAt) : new Date(license.lastHeartbeatAt);
          const diff = now.getTime() - sessionStart.getTime();
          durationText = `Online (${formatDuration(diff)})`;
        } else if (license.lastHeartbeatAt) {
          const diff = now.getTime() - new Date(license.lastHeartbeatAt).getTime();
          durationText = `Offline (${formatDuration(diff)})`;
        }

        let usagePercentage = 0;
        if (license.activatedAt) {
          const endTime = (license.expireAt && new Date(license.expireAt) < now) ? new Date(license.expireAt) : now;
          const totalTime = Math.max(1, (endTime.getTime() - new Date(license.activatedAt).getTime()) / 1000);
          usagePercentage = Math.min(100, Math.round((license.totalUsageSeconds / totalTime) * 100));
        }

        return {
          ...license,
          discordId: claimMap.get(license.key) ?? null,
          isOnline,
          durationText,
          usagePercentage
        };
      });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in listKey:", error);
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

exports.claimStock = async (req, res) => {
  try {
    const {
      discordId,
      expDays,
      secretToken,
      amount,
      paymentMethod = "bank",
      transRef,
      payload,
      senderName,
      senderBank
    } = req.body;

    if (!secretToken || secretToken !== process.env.BOT_SECRET) {
      return res.status(401).json({ success: false, message: "Unauthorized token" });
    }

    if (!discordId) {
      return res.status(400).json({ success: false, message: "discordId is required" });
    }

    const expDaysVal = parseInt(expDays);
    const amountVal = parseFloat(amount) || 0;

    // Run transactional query to isolate claims, prevent race conditions, and record history
    const result = await prisma.$transaction(async (tx) => {
      // 1. ตรวจสอบการชำระเงินซ้ำ (ถ้ามีข้อมูลการชำระเงินเข้ามา)
      if ((paymentMethod === "bank" || paymentMethod === "promptpay") && (transRef || payload)) {
        if (transRef) {
          const dupRef = await tx.verifiedSlip.findUnique({ where: { transRef } });
          if (dupRef) throw new Error("DUPLICATE_SLIP");
        }
        if (payload) {
          const dupPayload = await tx.verifiedSlip.findUnique({ where: { payload } });
          if (dupPayload) throw new Error("DUPLICATE_SLIP");
        }

        // บันทึกสลิป
        await tx.verifiedSlip.create({
          data: {
            transRef: transRef || `MANUAL-${Date.now()}`,
            payload: payload || `MANUAL-PAYLOAD-${Date.now()}`,
            discordId,
            amount: amountVal,
          }
        });
      } else if (paymentMethod === "truemoney" && transRef) {
        // สำหรับทรูมันนี่ ใช้ transRef (ลิงก์ซอง) ในการเช็คซ้ำในประวัติการซื้อ
        const dupVoucher = await tx.purchaseHistory.findUnique({
          where: { transRef }
        });
        if (dupVoucher) throw new Error("DUPLICATE_VOUCHER");
      }

      // 2. หาคีย์เคลมจากสต็อก
      const claims = await tx.claim.findMany({
        select: { key: true }
      });
      const claimedKeys = claims.map(c => c.key);

      const queryWhere = {
        status: "Enable",
        hwid: null,
        usedBy: null,
        key: {
          notIn: claimedKeys
        }
      };

      if (isNaN(expDaysVal) || expDaysVal === 0) {
        queryWhere.OR = [
          { expDays: 0 },
          { expDays: null }
        ];
      } else {
        queryWhere.expDays = expDaysVal;
      }

      const license = await tx.license.findFirst({
        where: queryWhere
      });

      if (!license) {
        throw new Error("OUT_OF_STOCK");
      }

      // 3. สร้าง Claim Record
      await tx.claim.create({
        data: {
          key: license.key,
          discordId: discordId
        }
      });

      // 4. บันทึกประวัติการชื้อ (PurchaseHistory)
      await tx.purchaseHistory.create({
        data: {
          discordId,
          key: license.key,
          amount: amountVal,
          days: isNaN(expDaysVal) ? 0 : expDaysVal,
          paymentMethod,
          transRef,
          senderName,
          senderBank,
        }
      });

      return license;
    });

    return res.status(200).json({
      success: true,
      key: result.key,
      expDays: result.expDays,
      message: "Key claimed successfully from stock"
    });

  } catch (error) {
    if (error.message === "OUT_OF_STOCK") {
      return res.status(404).json({
        success: false,
        code: "OUT_OF_STOCK",
        message: "No keys available in stock for this duration"
      });
    }
    if (error.message === "DUPLICATE_SLIP") {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_SLIP",
        message: "สลิปนี้เคยใช้งานไปแล้วในระบบ"
      });
    }
    if (error.message === "DUPLICATE_VOUCHER") {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_VOUCHER",
        message: "ซองอั่งเปานี้เคยถูกเคลมในระบบไปแล้ว"
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkDuplicateSlip = async (req, res) => {
  try {
    const { payload, secretToken } = req.body;

    if (!secretToken || secretToken !== process.env.BOT_SECRET) {
      return res.status(401).json({ success: false, message: "Unauthorized token" });
    }

    if (!payload) {
      return res.status(400).json({ success: false, message: "payload is required" });
    }

    const existingSlip = await prisma.verifiedSlip.findUnique({
      where: { payload },
    });

    if (existingSlip) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: "สลิปนี้เคยใช้งานไปแล้วในระบบ",
      });
    }

    return res.status(200).json({
      success: true,
      duplicate: false,
      message: "สลิปนี้ยังไม่เคยใช้งาน",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStockStats = async (req, res) => {
  try {
    const claims = await prisma.claim.findMany({ select: { key: true } });
    const claimedKeys = claims.map(c => c.key);

    const getCounts = async (expDaysVal) => {
      const queryWhere = {};

      if (expDaysVal === "lifetime") {
        queryWhere.OR = [
          { expDays: 0 },
          { expDays: null }
        ];
      } else {
        queryWhere.expDays = expDaysVal;
      }

      // 1. นับยอดขายจากตาราง PurchaseHistory ตามแพ็กเกจ
      const daysParam = expDaysVal === "lifetime" ? 0 : expDaysVal;
      const sold = await prisma.purchaseHistory.count({
        where: {
          days: daysParam
        }
      });

      // 2. นับคีย์คงเหลือในตู้ (ที่ยังไม่ได้ถูกเคลม)
      const remaining = await prisma.license.count({
        where: {
          ...queryWhere,
          status: "Enable",
          hwid: null,
          usedBy: null,
          key: { notIn: claimedKeys }
        }
      });
      return { sold, remaining };
    };

    const stats = {
      days1: await getCounts(1),
      days7: await getCounts(7),
      days30: await getCounts(30),
      lifetime: await getCounts("lifetime"),
    };

    // นับยอดขายรวมจากตาราง PurchaseHistory
    const totalSold = await prisma.purchaseHistory.count();

    const totalRemaining = await prisma.license.count({
      where: {
        status: "Enable",
        hwid: null,
        usedBy: null,
        key: { notIn: claimedKeys }
      }
    });

    // ดึงรายชื่อผู้ซื้อล่าสุด 3 คน
    const recentPurchases = await prisma.purchaseHistory.findMany({
      orderBy: { purchasedAt: "desc" },
      take: 3,
      select: {
        discordId: true,
        days: true,
        purchasedAt: true
      }
    });

    return res.status(200).json({
      success: true,
      stats,
      total: {
        sold: totalSold,
        remaining: totalRemaining
      },
      recentPurchases
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.heartbeatKey = async (req, res) => {
  try {
    const { key, hwid, isOffline } = req.body;

    if (!key || !hwid) {
      return res.status(400).json({ success: false, message: "key and hwid are required" });
    }

    const license = await prisma.license.findUnique({
      where: { key }
    });

    if (!license) {
      return res.status(404).json({ success: false, message: "License not found" });
    }

    if (license.status !== "Enable") {
      return res.status(403).json({ success: false, message: "License is disabled" });
    }

    if (license.hwid && license.hwid !== hwid) {
      return res.status(403).json({ success: false, message: "HWID mismatch" });
    }

    const now = new Date();
    let updatedData = {};

    if (isOffline) {
      if (license.lastHeartbeatAt) {
        const last = new Date(license.lastHeartbeatAt);
        const diffSeconds = Math.floor((now.getTime() - last.getTime()) / 1000);
        
        // Accumulate final seconds if within 7 minutes
        if (diffSeconds > 0 && diffSeconds <= 7 * 60) {
          updatedData.totalUsageSeconds = license.totalUsageSeconds + diffSeconds;
        }
      }
      // Instantly mark offline by setting lastHeartbeatAt to now and currentSessionStartAt to null
      updatedData.lastHeartbeatAt = now;
      updatedData.currentSessionStartAt = null;
    } else {
      updatedData.lastHeartbeatAt = now;

      if (license.lastHeartbeatAt) {
        const last = new Date(license.lastHeartbeatAt);
        const diffSeconds = Math.floor((now.getTime() - last.getTime()) / 1000);

        // If the heartbeat is within a reasonable interval (e.g. 7 minutes), accumulate usage time
        if (diffSeconds > 0 && diffSeconds <= 7 * 60) {
          updatedData.totalUsageSeconds = license.totalUsageSeconds + diffSeconds;
          if (!license.currentSessionStartAt) {
            updatedData.currentSessionStartAt = now;
          }
        } else {
          // If it was offline (longer than 7 minutes), reset session start
          updatedData.currentSessionStartAt = now;
        }
      } else {
        // First heartbeat
        updatedData.currentSessionStartAt = now;
      }
    }

    await prisma.license.update({
      where: { key },
      data: updatedData
    });

    return res.status(200).json({
      success: true,
      message: isOffline ? "Offline state recorded successfully" : "Heartbeat recorded successfully"
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopupStats = async (req, res) => {
  try {
    const bankStats = await prisma.purchaseHistory.aggregate({
      where: { paymentMethod: "bank" },
      _sum: { amount: true }
    });

    const promptpayStats = await prisma.purchaseHistory.aggregate({
      where: { paymentMethod: "promptpay" },
      _sum: { amount: true }
    });

    const truemoneyStats = await prisma.purchaseHistory.aggregate({
      where: { paymentMethod: "truemoney" },
      _sum: { amount: true }
    });

    const totalBank = bankStats._sum.amount || 0;
    const totalPromptPay = promptpayStats._sum.amount || 0;
    const totalTrueMoney = truemoneyStats._sum.amount || 0;
    const totalTopup = totalBank + totalPromptPay + totalTrueMoney;

    return res.status(200).json({
      success: true,
      data: {
        totalBank,
        totalPromptPay,
        totalTrueMoney,
        totalTopup
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserKeys = async (req, res) => {
  try {
    const { discordId, secretToken } = req.body;

    if (!secretToken || secretToken !== process.env.BOT_SECRET) {
      return res.status(401).json({ success: false, message: "Unauthorized token" });
    }

    if (!discordId) {
      return res.status(400).json({ success: false, message: "discordId is required" });
    }

    const claims = await prisma.claim.findMany({
      where: { discordId },
      select: { key: true }
    });

    const keys = claims.map((c) => c.key);

    if (keys.length === 0) {
      return res.status(200).json({ success: true, keys: [] });
    }

    const now = new Date();
    const licenses = await prisma.license.findMany({
      where: {
        key: { in: keys },
        status: "Enable",
        OR: [
          { expireAt: null },
          { expireAt: { gte: now } }
        ]
      },
      select: {
        id: true,
        key: true,
        expDays: true,
        expireAt: true,
        hwid: true,
        resetCooldownAt: true
      }
    });

    return res.status(200).json({ success: true, keys: licenses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.claimTrialKey = async (req, res) => {
  try {
    const { discordId, secretToken } = req.body;

    if (!secretToken || secretToken !== process.env.BOT_SECRET) {
      return res.status(401).json({ success: false, message: "Unauthorized token" });
    }

    if (!discordId) {
      return res.status(400).json({ success: false, message: "discordId is required" });
    }

    // Check if user already claimed a trial key (key starting with TRIAL-)
    const existingTrial = await prisma.claim.findFirst({
      where: {
        discordId,
        key: {
          startsWith: "TRIAL-"
        }
      }
    });

    if (existingTrial) {
      return res.status(400).json({
        success: false,
        message: "You have already claimed your 1-day trial key!"
      });
    }

    // Generate a unique trial key
    let trialKey;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      trialKey = `TRIAL-${generateKey()}`;
      const existingKey = await prisma.license.findUnique({
        where: { key: trialKey }
      });
      if (!existingKey) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ success: false, message: "Failed to generate a unique trial key" });
    }

    // Run transactional query to create the key and the claim
    await prisma.$transaction(async (tx) => {
      // Create license with status: Enable, expDays: 1
      await tx.license.create({
        data: {
          key: trialKey,
          status: "Enable",
          expDays: 1,
          activatedAt: null,
          expireAt: null,
        }
      });

      // Create claim
      await tx.claim.create({
        data: {
          key: trialKey,
          discordId,
        }
      });
    });

    return res.status(200).json({
      success: true,
      key: trialKey,
      message: "Trial key claimed successfully"
    });
  } catch (error) {
    console.error("Error in claimTrialKey:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};