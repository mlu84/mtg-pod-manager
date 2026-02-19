ALTER TABLE `User`
  ADD COLUMN `emailVerificationTokenExpiresAt` DATETIME(3) NULL;

UPDATE `User`
SET `emailVerificationTokenExpiresAt` = DATE_ADD(`createdAt`, INTERVAL 24 HOUR)
WHERE `emailVerificationToken` IS NOT NULL
  AND `emailVerificationTokenExpiresAt` IS NULL;
