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

exports.createKey = async (req, res) => {
  try {
    const amount = parseInt(req.body.amount) || 1;
    const expDays = parseInt(req.body.exp) || 0;
    const maxUsersPerKey = parseInt(req.body.maxUsersPerKey) || 1;

    const expireAt =
      expDays > 0 ? new Date(Date.now() + expDays * 24 * 60 * 60 * 1000) : null;

    const keys = Array.from({ length: amount }).map(() => generateKey());

    await prisma.licence.createMany({
      data: keys.map((key) => ({
        key,
        status: "Enable",
        expireAt,
        maxUsersPerKey,
      })),
    });

    return res.status(200).json({
      success: true,
      amount: keys.length,
      exp: expDays,
      expireAt,
      maxUsersPerKey,
      keys,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.listKey = async (req, res) => {
  try {
    const licences = await prisma.licence.findMany({
      include: {
        hwids: { select: { hwid: true, createdAt: true } },
      },
    });

    const result = licences.map((l) => ({
      ...l,
      usedSlots: l.hwids.length,           // ใช้ไปแล้วกี่ slot
      availableSlots: l.maxUsersPerKey - l.hwids.length, // เหลืออีกกี่ slot
    }));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteKey = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.licence.delete({
      where: {
        id: parseInt(id),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Key deleted",
      data: deleted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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
      include: { hwids: true }, // ดึง HWID ทั้งหมดที่ผูกไว้
    });

    if (!licence) {
      return res.status(404).json({ success: false, message: "Invalid key" });
    }

    if (licence.status !== "Enable") {
      return res.status(403).json({ success: false, message: "Licence inactive" });
    }

    if (licence.expireAt && licence.expireAt < new Date()) {
      return res.status(403).json({ success: false, message: "Licence expired" });
    }

    // ✅ HWID นี้เคยผูกกับ key นี้แล้ว → ผ่านเลย (login ซ้ำได้)
    const alreadyBound = licence.hwids.some((h) => h.hwid === hwid);
    if (alreadyBound) {
      return res.status(200).json({ success: true, message: "Activated" });
    }

    // ✅ เช็ค slot เต็มยัง
    if (licence.hwids.length >= licence.maxUsersPerKey) {
      return res.status(403).json({
        success: false,
        message: `Key is full (max ${licence.maxUsersPerKey} user${licence.maxUsersPerKey > 1 ? "s" : ""})`,
      });
    }

    // ✅ ผูก HWID ใหม่
    await prisma.$transaction([
      prisma.licenceHwid.create({
        data: { licenceId: licence.id, hwid },
      }),
      // อัป activatedAt ครั้งแรก
      ...(!licence.activatedAt
        ? [prisma.licence.update({
            where: { key },
            data: { activatedAt: new Date() },
          })]
        : []),
    ]);

    return res.status(200).json({ success: true, message: "Activated" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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
      where: { activatedAt: { not: null } },
    });

    const expiredKeys = await prisma.licence.count({
      where: {
        expireAt: { lt: new Date() },
        expireAt: { not: null },
      },
    });

    const unusedKeys = await prisma.licence.count({
      where: { activatedAt: null },
    });

    // Recent 7 days key creation
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentKeys = await prisma.licence.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        key: true,
        status: true,
        createdAt: true,
        activatedAt: true,
        expireAt: true,
      },
    });

    // Last 10 keys
    const latestKeys = await prisma.licence.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        key: true,
        hwids: { select: { hwid: true, createdAt: true } },
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.resetKey = async (req, res) => {
  try {
    const { key, hwid } = req.body; // hwid = optional, ถ้าไม่ส่งมา = ล้างทั้งหมด

    if (!key) {
      return res.status(400).json({ success: false, message: "Key is required" });
    }

    const licence = await prisma.licence.findUnique({ where: { key } });

    if (!licence) {
      return res.status(404).json({ success: false, message: "Licence not found" });
    }

    if (hwid) {
      // ล้างแค่ HWID ที่ระบุ
      await prisma.licenceHwid.deleteMany({
        where: { licenceId: licence.id, hwid },
      });
    } else {
      // ล้างทั้งหมด
      await prisma.licenceHwid.deleteMany({
        where: { licenceId: licence.id },
      });
    }

    return res.status(200).json({
      success: true,
      message: hwid ? "HWID reset successfully" : "All HWIDs reset successfully",
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
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const update = await prisma.licence.update({
      where: {
        id: parseInt(id),
      },
      data: {
        status,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Key updated",
      data: update,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
