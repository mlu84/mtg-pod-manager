-- AlterTable
ALTER TABLE `Group`
  ADD COLUMN `nextSeasonName` VARCHAR(191) NULL,
  ADD COLUMN `nextSeasonStartsAt` DATETIME(3) NULL,
  ADD COLUMN `nextSeasonEndsAt` DATETIME(3) NULL,
  ADD COLUMN `nextSeasonIsSuccessive` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `nextSeasonInterval` ENUM('WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY') NULL,
  ADD COLUMN `nextSeasonIntermissionDays` INTEGER NOT NULL DEFAULT 0;
