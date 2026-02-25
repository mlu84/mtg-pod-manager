ALTER TABLE `User`
  ADD COLUMN `hasUnreadNews` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `NewsEntry` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `createdByUserId` VARCHAR(191) NULL,

  INDEX `NewsEntry_createdAt_idx`(`createdAt`),
  INDEX `NewsEntry_createdByUserId_idx`(`createdByUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `NewsEntry`
  ADD CONSTRAINT `NewsEntry_createdByUserId_fkey`
  FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
