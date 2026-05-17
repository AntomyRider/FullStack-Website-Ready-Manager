/*
  Warnings:

  - You are about to drop the column `hwid` on the `licence` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Licence_hwid_idx` ON `licence`;

-- AlterTable
ALTER TABLE `licence` DROP COLUMN `hwid`,
    ADD COLUMN `maxUsersPerKey` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `usedCount` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `LicenceHwid` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `licenceId` INTEGER NOT NULL,
    `hwid` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LicenceHwid_licenceId_hwid_key`(`licenceId`, `hwid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LicenceHwid` ADD CONSTRAINT `LicenceHwid_licenceId_fkey` FOREIGN KEY (`licenceId`) REFERENCES `Licence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
