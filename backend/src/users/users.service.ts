import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma, SystemRole } from '@prisma/client';
import { toImageDataUrl } from './users-image.util';

const profileSelect = {
  id: true,
  email: true,
  inAppName: true,
  emailVerified: true,
  createdAt: true,
  avatarImage: true,
  avatarImageMime: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async verifyEmail(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
      },
    });
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      },
    });
  }

  async consumePasswordResetToken(
    tokenHash: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: {
          gt: new Date(),
        },
      },
      data: {
        password: hashedPassword,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return result.count > 0;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });

    return user ? this.toProfileResponse(user) : null;
  }

  async getApplications(userId: string) {
    const applications = await this.prisma.groupApplication.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            format: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return applications.map((app) => ({
      group: app.group,
      createdAt: app.createdAt,
    }));
  }

  async updateProfile(userId: string, data: { inAppName?: string }) {
    if (data.inAppName) {
      // Check if name is already taken by another user
      const existing = await this.prisma.user.findFirst({
        where: {
          inAppName: data.inAppName,
          NOT: { id: userId },
        },
      });

      if (existing) {
        throw new ConflictException('This display name is already taken');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        inAppName: data.inAppName,
      },
      select: profileSelect,
    });

    return this.toProfileResponse(user);
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image provided');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image type');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarImage: file.buffer,
        avatarImageMime: file.mimetype,
      },
      select: {
        avatarImage: true,
        avatarImageMime: true,
      },
    });

    return {
      avatarUrl: toImageDataUrl(updated.avatarImage, updated.avatarImageMime),
    };
  }

  async deleteOwnAccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        inAppName: true,
        systemRole: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.systemRole === SystemRole.SYSADMIN) {
      throw new ForbiddenException('Sysadmin accounts cannot be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      const memberships = await tx.usersOnGroups.findMany({
        where: { userId },
        select: {
          groupId: true,
          role: true,
        },
      });

      const groupsToDelete = new Set<string>();
      const groupsToKeep = new Set<string>();

      for (const membership of memberships) {
        const otherMembers = await tx.usersOnGroups.findMany({
          where: {
            groupId: membership.groupId,
            NOT: { userId },
          },
          select: {
            userId: true,
            role: true,
            assignedAt: true,
          },
          orderBy: [{ assignedAt: 'asc' }, { userId: 'asc' }],
        });

        if (otherMembers.length === 0) {
          groupsToDelete.add(membership.groupId);
          continue;
        }

        if (membership.role === 'ADMIN' && !otherMembers.some((m) => m.role === 'ADMIN')) {
          const successor = otherMembers[0];
          await tx.usersOnGroups.update({
            where: {
              userId_groupId: {
                userId: successor.userId,
                groupId: membership.groupId,
              },
            },
            data: {
              role: 'ADMIN',
            },
          });
        }

        await tx.usersOnGroups.delete({
          where: {
            userId_groupId: {
              userId,
              groupId: membership.groupId,
            },
          },
        });

        groupsToKeep.add(membership.groupId);
      }

      const groupsToDeleteList = [...groupsToDelete];
      const groupsToKeepList = [...groupsToKeep];

      const ownedDecks = await tx.deck.findMany({
        where: {
          ownerId: userId,
          ...(groupsToDeleteList.length > 0
            ? { groupId: { notIn: groupsToDeleteList } }
            : {}),
        },
        select: {
          id: true,
        },
      });

      const ownedDeckIds = ownedDecks.map((deck) => deck.id);
      if (ownedDeckIds.length > 0) {
        await tx.gamePlacement.updateMany({
          where: { deckId: { in: ownedDeckIds } },
          data: { deletedDeckName: 'Deleted Deck' },
        });

        await tx.deck.deleteMany({
          where: {
            id: { in: ownedDeckIds },
          },
        });
      }

      await tx.gamePlacement.updateMany({
        where: { userId },
        data: { userId: null },
      });

      for (const groupId of groupsToDeleteList) {
        await this.deleteGroupWithRelations(tx, groupId);
      }

      for (const groupId of groupsToKeepList) {
        await tx.groupEvent.create({
          data: {
            groupId,
            type: 'USER_ACCOUNT_DELETED',
            message: `${user.inAppName} deleted their account`,
          },
        });
      }

      await tx.user.delete({
        where: { id: userId },
      });
    });

    return { message: 'Account deleted successfully' };
  }

  private async deleteGroupWithRelations(tx: Prisma.TransactionClient, groupId: string): Promise<void> {
    await tx.gamePlacement.deleteMany({
      where: {
        game: {
          groupId,
        },
      },
    });

    await tx.game.deleteMany({
      where: { groupId },
    });

    await tx.deck.deleteMany({
      where: { groupId },
    });

    await tx.groupEvent.deleteMany({
      where: { groupId },
    });

    await tx.groupApplication.deleteMany({
      where: { groupId },
    });

    await tx.usersOnGroups.deleteMany({
      where: { groupId },
    });

    await tx.group.delete({
      where: { id: groupId },
    });
  }

  private toProfileResponse(user: {
    id: string;
    email: string;
    inAppName: string;
    emailVerified: Date | null;
    createdAt: Date;
    avatarImage: Buffer | null;
    avatarImageMime: string | null;
  }) {
    const { avatarImage, avatarImageMime, ...profile } = user;
    return {
      ...profile,
      avatarUrl: toImageDataUrl(avatarImage, avatarImageMime),
    };
  }
}
