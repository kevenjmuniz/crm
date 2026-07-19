import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

/**
 * Cliente HTTP para a Evolution API (v2).
 * Docs: https://doc.evolution-api.com
 */
@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private async request<T>(promise: Promise<{ data: T }>): Promise<T> {
    try {
      const { data } = await promise;
      return data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const detail = axiosErr.response?.data ?? axiosErr.message;
      this.logger.error(`Evolution API error: ${JSON.stringify(detail)}`);
      throw new BadGatewayException({
        message: 'Erro na Evolution API',
        detail,
      });
    }
  }

  /** Cria a instancia e ja configura o webhook apontando para o CRM. */
  async createInstance(instanceName: string) {
    const webhookBase = this.config.get<string>('WEBHOOK_BASE_URL');
    const token = this.config.get<string>('WEBHOOK_TOKEN');
    return this.request(
      firstValueFrom(
        this.http.post('/instance/create', {
          instanceName,
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true,
          webhook: {
            url: `${webhookBase}/api/webhooks/evolution/${token}`,
            byEvents: false,
            base64: false,
            events: [
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CONTACTS_UPSERT',
            ],
          },
        }),
      ),
    );
  }

  /** (Re)registra o webhook da instancia apontando para o CRM. */
  async setWebhook(instanceName: string) {
    const webhookBase = this.config.get<string>('WEBHOOK_BASE_URL');
    const token = this.config.get<string>('WEBHOOK_TOKEN');
    return this.request(
      firstValueFrom(
        this.http.post(`/webhook/set/${instanceName}`, {
          webhook: {
            enabled: true,
            url: `${webhookBase}/api/webhooks/evolution/${token}`,
            byEvents: false,
            base64: false,
            events: [
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CONTACTS_UPSERT',
            ],
          },
        }),
      ),
    );
  }

  /** Retorna QR code / inicia conexao. */
  async connect(instanceName: string) {
    return this.request(
      firstValueFrom(this.http.get(`/instance/connect/${instanceName}`)),
    );
  }

  async connectionState(instanceName: string) {
    return this.request(
      firstValueFrom(this.http.get(`/instance/connectionState/${instanceName}`)),
    );
  }

  async logout(instanceName: string) {
    return this.request(
      firstValueFrom(this.http.delete(`/instance/logout/${instanceName}`)),
    );
  }

  async deleteInstance(instanceName: string) {
    return this.request(
      firstValueFrom(this.http.delete(`/instance/delete/${instanceName}`)),
    );
  }

  /** Envia texto. `number` no formato 5511999999999. */
  async sendText(instanceName: string, number: string, text: string) {
    return this.request(
      firstValueFrom(
        this.http.post(`/message/sendText/${instanceName}`, { number, text }),
      ),
    );
  }

  /** Envia midia por URL. */
  async sendMedia(
    instanceName: string,
    number: string,
    mediaUrl: string,
    options?: { caption?: string; mediatype?: 'image' | 'video' | 'document' | 'audio' },
  ) {
    return this.request(
      firstValueFrom(
        this.http.post(`/message/sendMedia/${instanceName}`, {
          number,
          mediatype: options?.mediatype ?? 'image',
          media: mediaUrl,
          caption: options?.caption,
        }),
      ),
    );
  }

  /** Verifica se numeros possuem WhatsApp. */
  async checkNumbers(instanceName: string, numbers: string[]) {
    return this.request(
      firstValueFrom(
        this.http.post(`/chat/whatsappNumbers/${instanceName}`, { numbers }),
      ),
    );
  }
}
