import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type GroupInviteEmailPayload = {
  to: string;
  inviterName: string;
  groupName: string;
  inviteCode: string;
};

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

  async sendPasswordResetEmail(
    to: string,
    inAppName: string,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Reset your MTG Pod-Manager password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p>Hello ${inAppName},</p>
          <p>You requested a password reset for your MTG Pod-Manager account.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="background-color: #4CAF50; color: white; padding: 14px 28px;
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>This link expires in 15 minutes and can only be used once.</p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you did not request this reset, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  }

  async sendGroupInviteEmail(payload: GroupInviteEmailPayload): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const registrationLink = `${frontendUrl}/register`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: payload.to,
      subject: `${payload.inviterName} invited you to ${payload.groupName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Group Invitation</h1>
          <p>Hello,</p>
          <p><strong>${payload.inviterName}</strong> invited you to join <strong>${payload.groupName}</strong> on MTG Pod-Manager.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${registrationLink}"
               style="background-color: #4CAF50; color: white; padding: 14px 28px;
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Register
            </a>
          </p>
          <p><strong>Invite code:</strong> ${payload.inviteCode}</p>
          <p><strong>Quick start:</strong></p>
          <ol>
            <li>Create an account using the registration link above.</li>
            <li>Verify your email address.</li>
            <li>Open "Join Group" and enter the invite code.</li>
          </ol>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If this invite was not expected, you can ignore this email.
          </p>
        </div>
      `,
    });
  }
}
