import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  systemRole: 'USER' | 'SYSADMIN';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly pulseIntervalMs = 60 * 1000;
  private readonly pulseCache = new Map<string, number>();

  constructor(
    configService: ConfigService,
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne({ id: payload.sub });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    this.recordUserPulse(user.id);

    return {
      id: user.id,
      email: user.email,
      inAppName: user.inAppName,
      emailVerified: !!user.emailVerified,
      systemRole: user.systemRole,
    };
  }

  private recordUserPulse(userId: string): void {
    const now = Date.now();
    const lastPulseAt = this.pulseCache.get(userId) ?? 0;
    if (now - lastPulseAt < this.pulseIntervalMs) {
      return;
    }
    this.pulseCache.set(userId, now);

    void this.prisma
      .$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { lastSeenAt: new Date(now) },
          select: { id: true },
        }),
        this.prisma.userActivityPulse.create({
          data: { userId },
          select: { id: true },
        }),
      ])
      .catch((error) => {
        this.logger.warn(`Failed to record user activity pulse: ${(error as Error).message}`);
      });
  }
}
