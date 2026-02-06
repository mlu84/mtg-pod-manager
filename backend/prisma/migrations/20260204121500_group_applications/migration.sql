-- CreateTable
CREATE TABLE `GroupApplication` (
  `id` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `userId` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,

  UNIQUE INDEX `GroupApplication_userId_groupId_key`(`userId`, `groupId`),
  INDEX `GroupApplication_userId_idx`(`userId`),
  INDEX `GroupApplication_groupId_idx`(`groupId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GroupApplication` ADD CONSTRAINT `GroupApplication_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupApplication` ADD CONSTRAINT `GroupApplication_groupId_fkey`
FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
