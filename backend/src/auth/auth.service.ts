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
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(createAuthDto: CreateAuthDto): Promise<{ message: string }> {
    const hashedPassword = await bcrypt.hash(createAuthDto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    try {
      const user = await this.usersService.createUser({
        email: createAuthDto.email,
        inAppName: createAuthDto.inAppName,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
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

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token.');
    }

    await this.usersService.verifyEmail(user.id);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return `${frontendUrl}/login?verified=true`;
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

  private async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne({ email });
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
