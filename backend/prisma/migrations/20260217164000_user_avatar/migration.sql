-- AlterTable
ALTER TABLE `User`
  ADD COLUMN `avatarImage` LONGBLOB NULL,
  ADD COLUMN `avatarImageMime` VARCHAR(191) NULL;
