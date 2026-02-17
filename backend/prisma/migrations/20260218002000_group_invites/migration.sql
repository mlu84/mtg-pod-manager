-- CreateTable
CREATE TABLE `GroupInvite` (
  `id` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `type` ENUM('USER', 'EMAIL') NOT NULL,
  `invitedEmail` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `inviterUserId` VARCHAR(191) NOT NULL,
  `invitedUserId` VARCHAR(191) NULL,

  UNIQUE INDEX `GroupInvite_groupId_invitedUserId_key`(`groupId`, `invitedUserId`),
  UNIQUE INDEX `GroupInvite_groupId_invitedEmail_key`(`groupId`, `invitedEmail`),
  INDEX `GroupInvite_groupId_idx`(`groupId`),
  INDEX `GroupInvite_inviterUserId_idx`(`inviterUserId`),
  INDEX `GroupInvite_invitedUserId_idx`(`invitedUserId`),
  INDEX `GroupInvite_invitedEmail_idx`(`invitedEmail`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GroupInvite`
ADD CONSTRAINT `GroupInvite_groupId_fkey`
FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupInvite`
ADD CONSTRAINT `GroupInvite_inviterUserId_fkey`
FOREIGN KEY (`inviterUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupInvite`
ADD CONSTRAINT `GroupInvite_invitedUserId_fkey`
FOREIGN KEY (`invitedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
