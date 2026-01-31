import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    // Resend's free tier requires using their test domain
    this.fromEmail = 'MTG Pod-Manager <onboarding@resend.dev>';
  }

  async sendVerificationEmail(
    to: string,
    inAppName: string,
    verificationToken: string,
  ): Promise<void> {
    const backendUrl = this.configService.get<string>('BACKEND_URL');
    const verificationLink = `${backendUrl}/auth/verify?token=${verificationToken}`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: to,
      subject: 'Verify your MTG Pod-Manager account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to MTG Pod-Manager!</h1>
          <p>Hello ${inAppName},</p>
          <p>Thank you for registering. Please click the button below to verify your email address:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}"
               style="background-color: #4CAF50; color: white; padding: 14px 28px;
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${verificationLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you did not create an account, please ignore this email.
          </p>
        </div>
      `,
    });
  }
}
