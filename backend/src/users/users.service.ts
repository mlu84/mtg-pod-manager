import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

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

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        inAppName: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return user;
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
      select: {
        id: true,
        email: true,
        inAppName: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return user;
  }
}
