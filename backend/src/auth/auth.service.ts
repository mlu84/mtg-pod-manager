import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Prisma, SystemRole } from '@prisma/client';
import { AuthRateLimitService } from './auth-rate-limit.service';

type AuthenticatedUser = {
  id: string;
  email: string;
  inAppName: string;
  systemRole: SystemRole;
  emailVerified: Date | null;
};

@Injectable()
export class AuthService {
  private static readonly EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
  private static readonly FORGOT_PASSWORD_RATE_LIMIT_MAX = 5;
  private static readonly RESET_PASSWORD_RATE_LIMIT_MAX = 10;
  private static readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
  private static readonly RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
  private static readonly FORGOT_PASSWORD_GENERIC_MESSAGE =
    'If an account exists for this email, a reset link has been sent.';

  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private authRateLimitService: AuthRateLimitService,
  ) {}

  async signUp(createAuthDto: CreateAuthDto): Promise<{ message: string }> {
    const hashedPassword = await bcrypt.hash(createAuthDto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = this.getEmailVerificationExpiry();

    try {
      const user = await this.usersService.createUser({
        email: createAuthDto.email,
        inAppName: createAuthDto.inAppName,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiresAt: verificationTokenExpiresAt,
      });

      await this.mailService.sendVerificationEmail(
        user.email,
        user.inAppName,
        verificationToken,
      );

      return {
        message:
          'Registration successful. Please check your email to verify your account.',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or inAppName already exists.');
      }
      throw error;
    }
  }

  async verifyEmail(token: string): Promise<string> {
    const user = await this.usersService.findByVerificationToken(token);

    const tokenExpired =
      !user?.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt.getTime() <= Date.now();

    if (!user || tokenExpired) {
      throw new BadRequestException('Invalid or expired verification token.');
    }

    await this.usersService.verifyEmail(user.id);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return `${frontendUrl}/login?verified=true`;
  }

  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email is already verified.');
    }

    if (!user.emailVerificationToken || !user.emailVerificationTokenExpiresAt) {
      throw new BadRequestException(
        'Verification link cannot be renewed yet. Please contact support.',
      );
    }

    if (user.emailVerificationTokenExpiresAt.getTime() > Date.now()) {
      throw new BadRequestException(
        'Your current verification link is still valid. Please use it first.',
      );
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = this.getEmailVerificationExpiry();

    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
      verificationTokenExpiresAt,
    );

    await this.mailService.sendVerificationEmail(
      user.email,
      user.inAppName,
      verificationToken,
    );

    return { message: 'A new verification email has been sent.' };
  }

  async signIn(loginAuthDto: LoginAuthDto): Promise<{
    access_token: string;
    emailVerified: boolean;
  }> {
    const user = await this.validateUser(
      loginAuthDto.email,
      loginAuthDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      emailVerified: !!user.emailVerified,
      systemRole: user.systemRole,
    };

    return {
      access_token: this.jwtService.sign(payload),
      emailVerified: !!user.emailVerified,
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    clientIp: string,
  ): Promise<{ message: string }> {
    this.authRateLimitService.consume(
      `forgot-password:${clientIp}`,
      AuthService.FORGOT_PASSWORD_RATE_LIMIT_MAX,
      AuthService.RATE_LIMIT_WINDOW_MS,
    );

    const user = await this.usersService.findOne({ email: forgotPasswordDto.email });
    if (!user) {
      return { message: AuthService.FORGOT_PASSWORD_GENERIC_MESSAGE };
    }

    try {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      const expiresAt = new Date(Date.now() + AuthService.RESET_TOKEN_TTL_MS);

      await this.usersService.setPasswordResetToken(user.id, resetTokenHash, expiresAt);

      await this.mailService.sendPasswordResetEmail(
        user.email,
        user.inAppName,
        resetToken,
      );
    } catch {
      // Keep response generic to avoid account enumeration side channels.
    }

    return { message: AuthService.FORGOT_PASSWORD_GENERIC_MESSAGE };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    clientIp: string,
  ): Promise<{ message: string }> {
    this.authRateLimitService.consume(
      `reset-password:${clientIp}`,
      AuthService.RESET_PASSWORD_RATE_LIMIT_MAX,
      AuthService.RATE_LIMIT_WINDOW_MS,
    );

    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetPasswordDto.token)
      .digest('hex');
    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);

    const consumed = await this.usersService.consumePasswordResetToken(
      resetTokenHash,
      hashedPassword,
    );

    if (!consumed) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    return { message: 'Password reset successful. Please log in with your new password.' };
  }

  private async validateUser(
    email: string,
    pass: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.usersService.findOne({ email });
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result as AuthenticatedUser;
    }
    return null;
  }

  private getEmailVerificationExpiry(): Date {
    return new Date(Date.now() + AuthService.EMAIL_VERIFICATION_TOKEN_TTL_MS);
  }
}
