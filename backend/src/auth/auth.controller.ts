import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, CurrentUserType } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  signUp(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.signUp(createAuthDto);
  }

  @Get('verify')
  async verifyEmail(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = this.authService.getEmailVerificationRedirectUrl(token);
    res.redirect(redirectUrl);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verifyEmailToken(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmailToken(verifyEmailDto.token);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.signIn(loginAuthDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.forgotPassword(
      forgotPasswordDto,
      this.getClientIp(req),
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.resetPassword(resetPasswordDto, this.getClientIp(req));
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  resendVerificationEmail(@CurrentUser() user: CurrentUserType) {
    return this.authService.resendVerificationEmail(user.id);
  }

  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0].trim();
    }

    return req.ip || 'unknown';
  }
}
