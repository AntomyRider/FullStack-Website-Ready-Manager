const prisma = require("./lib/prisma.js");

async function check() {
  try {
    const claims = await prisma.claim.findMany({ select: { key: true } });
    const claimedKeys = claims.map(c => c.key);

    console.log("Claimed keys:", claimedKeys);

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

      const sold = await prisma.license.count({
        where: {
          ...queryWhere,
          key: { in: claimedKeys }
        }
      });
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

    const totalSold = claimedKeys.length;
    const totalRemaining = await prisma.license.count({
      where: {
        status: "Enable",
        hwid: null,
        usedBy: null,
        key: { notIn: claimedKeys }
      }
    });

    console.log("STATS RESULT:", JSON.stringify({ stats, total: { sold: totalSold, remaining: totalRemaining } }, null, 2));

  } catch (err) {
    console.error("Database query error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();


