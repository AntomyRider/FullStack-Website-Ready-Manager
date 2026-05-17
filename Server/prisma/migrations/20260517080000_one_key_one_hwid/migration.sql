ALTER TABLE `Licence`
  ADD COLUMN `hwid` VARCHAR(191) NULL;

UPDATE `Licence` AS l
SET l.`hwid` = (
  SELECT h.`hwid`
  FROM `LicenceHwid` AS h
  WHERE h.`licenceId` = l.`id`
  ORDER BY h.`createdAt` ASC, h.`id` ASC
  LIMIT 1
)
WHERE l.`hwid` IS NULL;

DROP TABLE IF EXISTS `LicenceHwid`;

ALTER TABLE `Licence`
  DROP COLUMN `maxUsersPerKey`,
  DROP COLUMN `usedCount`;

CREATE INDEX `Licence_hwid_idx` ON `Licence`(`hwid`);
