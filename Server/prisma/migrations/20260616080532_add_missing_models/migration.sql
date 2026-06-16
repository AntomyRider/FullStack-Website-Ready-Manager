-- AlterTable
ALTER TABLE `License` ADD COLUMN `currentSessionStartAt` DATETIME(3) NULL,
    ADD COLUMN `lastHeartbeatAt` DATETIME(3) NULL,
    ADD COLUMN `totalUsageSeconds` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `VerifiedSlip` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transRef` VARCHAR(191) NOT NULL,
    `payload` VARCHAR(500) NOT NULL,
    `discordId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `verifiedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VerifiedSlip_transRef_key`(`transRef`),
    UNIQUE INDEX `VerifiedSlip_payload_key`(`payload`),
    INDEX `VerifiedSlip_transRef_idx`(`transRef`),
    INDEX `VerifiedSlip_payload_idx`(`payload`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `discordId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `days` INTEGER NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'bank',
    `transRef` VARCHAR(191) NULL,
    `senderName` VARCHAR(191) NULL,
    `senderBank` VARCHAR(191) NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PurchaseHistory_transRef_key`(`transRef`),
    INDEX `PurchaseHistory_discordId_idx`(`discordId`),
    INDEX `PurchaseHistory_purchasedAt_idx`(`purchasedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BotConfig` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `price1Day` INTEGER NOT NULL DEFAULT 19,
    `price7Days` INTEGER NOT NULL DEFAULT 69,
    `price30Days` INTEGER NOT NULL DEFAULT 169,
    `priceLifetime` INTEGER NOT NULL DEFAULT 199,
    `embedImageUrl` VARCHAR(512) NOT NULL,
    `embedTitle` VARCHAR(191) NOT NULL DEFAULT 'READY MANAGER : โปรแกรมช่วยโพสต์',
    `embedDescription` TEXT NOT NULL,
    `bankName` VARCHAR(191) NOT NULL DEFAULT 'กรุงไทย',
    `bankHolder` VARCHAR(191) NOT NULL DEFAULT 'นครินทร์ งานยางหวาย',
    `bankAccount` VARCHAR(191) NOT NULL DEFAULT '4280686564',
    `adminPhone` VARCHAR(191) NOT NULL DEFAULT '0832584267',
    `verifyChannelId` VARCHAR(191) NOT NULL DEFAULT '1506243441007398964',
    `logChannelId` VARCHAR(191) NOT NULL DEFAULT '1512868304891412572',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
