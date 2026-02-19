import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { MailService } from './mail.service';

type RequestWithRawBody = Request & { rawBody?: Buffer };

@Controller('mail/webhooks')
export class MailWebhookController {
  constructor(private readonly mailService: MailService) {}

  @Post('resend')
  @HttpCode(200)
  handleResendWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('resend-id') resendId: string,
    @Headers('resend-timestamp') resendTimestamp: string,
    @Headers('resend-signature') resendSignature: string,
  ) {
    const payload = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});

    return this.mailService.handleResendWebhook({
      payload,
      resendId,
      resendTimestamp,
      resendSignature,
    });
  }
}
