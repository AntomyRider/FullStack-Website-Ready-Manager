-- CreateTable
CREATE TABLE `HistoryKeyActivated` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `licenceId` INTEGER NOT NULL,
    `activatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HistoryKeyActivated_licenceId_idx`(`licenceId`),
    INDEX `HistoryKeyActivated_activatedAt_idx`(`activatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HistoryKeyActivated` ADD CONSTRAINT `HistoryKeyActivated_licenceId_fkey` FOREIGN KEY (`licenceId`) REFERENCES `Licence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
