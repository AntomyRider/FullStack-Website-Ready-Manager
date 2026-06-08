const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const prisma = require("./prisma.js");

const PRICE_1_DAY = parseInt(process.env.PRICE_1_DAY) || 19;
const PRICE_7_DAYS = parseInt(process.env.PRICE_7_DAYS) || 69;
const PRICE_30_DAYS = parseInt(process.env.PRICE_30_DAYS) || 169;
const PRICE_LIFETIME = parseInt(process.env.PRICE_LIFETIME) || 199;

async function migrate() {
  try {
    console.log("Starting data migration from Claim to PurchaseHistory...");

    // 1. Get all claims
    const claims = await prisma.claim.findMany();
    console.log(`Found ${claims.length} claims in database.`);

    let count = 0;
    for (const claim of claims) {
      // Check if this key already has a purchase history record
      const existing = await prisma.purchaseHistory.findUnique({
        where: { key: claim.key }
      });

      if (existing) {
        continue;
      }

      // 2. Find license details to get expDays
      const license = await prisma.license.findUnique({
        where: { key: claim.key }
      });

      if (!license) {
        console.warn(`Warning: License details not found for key: ${claim.key}`);
        continue;
      }

      // 3. Resolve price based on expDays
      let price = PRICE_LIFETIME;
      const days = license.expDays || 0;
      if (days === 1) price = PRICE_1_DAY;
      else if (days === 7) price = PRICE_7_DAYS;
      else if (days === 30) price = PRICE_30_DAYS;

      // 4. Create PurchaseHistory record
      await prisma.purchaseHistory.create({
        data: {
          discordId: claim.discordId,
          key: claim.key,
          amount: price,
          days: days,
          paymentMethod: "bank", // historical default
          transRef: `HISTORICAL-${claim.id}-${Date.now()}`, // unique reference
          senderName: "Historical Claim",
          senderBank: "Imported",
          purchasedAt: claim.claimedAt
        }
      });
      count++;
    }

    console.log(`Migration completed successfully! Created ${count} new PurchaseHistory records.`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
