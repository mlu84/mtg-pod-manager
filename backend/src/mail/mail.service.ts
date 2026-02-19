import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend, WebhookEventPayload } from 'resend';

type GroupInviteEmailPayload = {
  to: string;
  inviterName: string;
  groupName: string;
  inviteCode: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;
  private fromEmail: string;
  private resendWebhookSecret: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    const configuredFromEmail = this.configService
      .get<string>('MAIL_FROM_EMAIL')
      ?.trim();
    // Fallback keeps local/dev environments working until a verified sender domain is configured.
    this.fromEmail =
      configuredFromEmail && configuredFromEmail.length > 0
        ? configuredFromEmail
        : 'MTG Pod-Manager <onboarding@resend.dev>';

    this.resendWebhookSecret =
      this.configService.get<string>('RESEND_WEBHOOK_SECRET')?.trim() || '';

    if (this.fromEmail.toLowerCase().includes('onboarding@resend.dev')) {
      this.logger.warn(
        'MAIL_FROM_EMAIL is not configured. Using onboarding@resend.dev can reduce deliverability.',
      );
    }

    void this.checkSenderDomainHealth();
  }

  async sendVerificationEmail(
    to: string,
    inAppName: string,
    verificationToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const verificationLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    await this.sendEmailOrThrow('verification', {
      from: this.fromEmail,
      to,
      subject: 'Verify your MTG Pod-Manager account',
      tags: [{ name: 'email_type', value: 'verification' }],
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
          <p>This link expires after 24 hours.</p>
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
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await this.sendEmailOrThrow('password-reset', {
      from: this.fromEmail,
      to,
      subject: 'Reset your MTG Pod-Manager password',
      tags: [{ name: 'email_type', value: 'password_reset' }],
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

    await this.sendEmailOrThrow('group-invite', {
      from: this.fromEmail,
      to: payload.to,
      subject: `${payload.inviterName} invited you to ${payload.groupName}`,
      tags: [{ name: 'email_type', value: 'group_invite' }],
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

  async handleResendWebhook(input: {
    payload: string;
    resendId: string;
    resendTimestamp: string;
    resendSignature: string;
  }): Promise<{ received: true }> {
    if (!this.resendWebhookSecret) {
      this.logger.warn('RESEND_WEBHOOK_SECRET is not configured. Ignoring webhook.');
      return { received: true };
    }

    if (!input.resendId || !input.resendTimestamp || !input.resendSignature) {
      throw new BadRequestException('Missing Resend webhook signature headers');
    }

    let event: WebhookEventPayload;
    try {
      event = this.resend.webhooks.verify({
        payload: input.payload,
        headers: {
          id: input.resendId,
          timestamp: input.resendTimestamp,
          signature: input.resendSignature,
        },
        webhookSecret: this.resendWebhookSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid Resend webhook signature');
    }

    this.logWebhookEvent(event);
    return { received: true };
  }

  private async sendEmailOrThrow(
    emailType: 'verification' | 'password-reset' | 'group-invite',
    payload: Parameters<Resend['emails']['send']>[0],
  ): Promise<void> {
    const response = await this.resend.emails.send(payload);
    if (response.error || !response.data?.id) {
      this.logger.error(
        `Resend send failed for ${emailType}: ${response.error?.name ?? 'unknown_error'} ${response.error?.message ?? ''}`.trim(),
      );
      throw new InternalServerErrorException('Failed to send email');
    }

    this.logger.log(`Queued ${emailType} email ${response.data.id}`);
  }

  private logWebhookEvent(event: WebhookEventPayload): void {
    const type = event.type;
    const rawData = (event as unknown as { data?: unknown }).data;
    const data =
      rawData && typeof rawData === 'object' ? (rawData as Record<string, unknown>) : {};
    const emailId = String(data['email_id'] ?? '');
    const recipient = Array.isArray(data['to']) ? String(data['to'][0] ?? '') : '';
    const context = `${type}${emailId ? ` emailId=${emailId}` : ''}${recipient ? ` to=${recipient}` : ''}`;

    const issueTypes = new Set([
      'email.failed',
      'email.bounced',
      'email.complained',
      'email.suppressed',
      'email.delivery_delayed',
    ]);

    if (issueTypes.has(type)) {
      this.logger.warn(`Resend webhook issue: ${context}`);
      return;
    }

    this.logger.log(`Resend webhook: ${context}`);
  }

  private async checkSenderDomainHealth(): Promise<void> {
    const senderDomain = this.extractSenderDomain();
    if (!senderDomain || senderDomain === 'resend.dev') {
      return;
    }

    try {
      const response = await this.resend.domains.list();
      if (response.error) {
        this.logger.warn(`Could not check Resend domain status: ${response.error.message}`);
        return;
      }

      const domain = response.data?.data?.find(
        (entry) => entry.name.toLowerCase() === senderDomain,
      );
      if (!domain) {
        this.logger.warn(
          `Sender domain ${senderDomain} not found in Resend account. Deliverability may be impacted.`,
        );
        return;
      }

      if (domain.status !== 'verified') {
        this.logger.warn(
          `Resend domain ${senderDomain} status is ${domain.status}. Deliverability may be impacted.`,
        );
      }

      if (domain.capabilities.sending !== 'enabled') {
        this.logger.warn(
          `Resend domain ${senderDomain} sending capability is ${domain.capabilities.sending}.`,
        );
      }
    } catch (error) {
      this.logger.warn(`Could not check sender domain health: ${(error as Error).message}`);
    }
  }

  private extractSenderDomain(): string | null {
    const match = this.fromEmail.match(/<([^>]+)>/);
    const address = (match?.[1] ?? this.fromEmail).trim().toLowerCase();
    const atIndex = address.lastIndexOf('@');
    if (atIndex < 0 || atIndex === address.length - 1) {
      return null;
    }
    return address.slice(atIndex + 1);
  }
}
