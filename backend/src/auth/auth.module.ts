import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Module({
  imports: [
    UsersModule,
    MailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1d';
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn,
          } as JwtSignOptions,
        };
      },
      inject: [ConfigService],
  }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthRateLimitService],
  exports: [JwtStrategy],
})
export class AuthModule {}
