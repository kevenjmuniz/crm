import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { EvolutionWebhookPayload, WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooks: WebhooksService,
    private readonly config: ConfigService,
  ) {}

  /** Endpoint chamado pela Evolution API. Autenticado pelo token na URL. */
  @Public()
  @Post('evolution/:token')
  @HttpCode(200)
  async handleEvolution(
    @Param('token') token: string,
    @Body() payload: EvolutionWebhookPayload,
  ) {
    if (token !== this.config.get<string>('WEBHOOK_TOKEN')) {
      throw new ForbiddenException('Token de webhook invalido');
    }
    await this.webhooks.handle(payload);
    return { ok: true };
  }
}
