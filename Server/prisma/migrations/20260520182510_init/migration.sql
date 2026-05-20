-- CreateTable
CREATE TABLE `Licence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `hwid` VARCHAR(191) NULL,
    `status` ENUM('Enable', 'Disable') NOT NULL DEFAULT 'Enable',
    `expDays` INTEGER NULL,
    `expireAt` DATETIME(3) NULL,
    `activatedAt` DATETIME(3) NULL,
    `resetAt` DATETIME(3) NULL,
    `resetCooldownAt` DATETIME(3) NULL,
    `resetCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Licence_key_key`(`key`),
    INDEX `Licence_key_idx`(`key`),
    INDEX `Licence_hwid_idx`(`hwid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoryKeyActivated` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `licenceId` INTEGER NOT NULL,
    `activatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HistoryKeyActivated_licenceId_idx`(`licenceId`),
    INDEX `HistoryKeyActivated_activatedAt_idx`(`activatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Claim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `discordId` VARCHAR(191) NOT NULL,
    `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Claim_key_key`(`key`),
    INDEX `Claim_discordId_idx`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'admin',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HistoryKeyActivated` ADD CONSTRAINT `HistoryKeyActivated_licenceId_fkey` FOREIGN KEY (`licenceId`) REFERENCES `Licence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
