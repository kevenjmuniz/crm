import { Injectable, Logger } from '@nestjs/common';
import { MessageType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: any;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: EvolutionWebhookPayload) {
    const event = payload.event?.toLowerCase();
    try {
      switch (event) {
        case 'connection.update':
          await this.onConnectionUpdate(payload);
          break;
        case 'messages.upsert':
          await this.onMessagesUpsert(payload);
          break;
        case 'messages.update':
          await this.onMessagesUpdate(payload);
          break;
        case 'contacts.upsert':
          await this.onContactsUpsert(payload);
          break;
        default:
          this.logger.debug(`Evento ignorado: ${event}`);
      }
    } catch (err) {
      // Nunca propagar erro para a Evolution nao ficar reenviando
      this.logger.error(`Erro processando webhook ${event}`, err as Error);
    }
  }

  private async onConnectionUpdate(payload: EvolutionWebhookPayload) {
    const state = payload.data?.state;
    if (!state) return;
    const statusMap: Record<string, 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'> = {
      open: 'CONNECTED',
      connecting: 'CONNECTING',
      close: 'DISCONNECTED',
    };
    const status = statusMap[state] ?? 'DISCONNECTED';
    await this.prisma.instance.updateMany({
      where: { name: payload.instance },
      data: { status },
    });
  }

  private async onMessagesUpsert(payload: EvolutionWebhookPayload) {
    const data = payload.data;
    const key = data?.key;
    const remoteJid: string | undefined = key?.remoteJid;
    if (!key || !remoteJid) return;
    // ignora grupos e broadcast no MVP
    if (!remoteJid.endsWith('@s.whatsapp.net')) return;

    const instance = await this.prisma.instance.findUnique({
      where: { name: payload.instance },
    });
    if (!instance) {
      this.logger.warn(`Instancia desconhecida no webhook: ${payload.instance}`);
      return;
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '');
    const fromMe: boolean = Boolean(key.fromMe);

    const contact = await this.prisma.contact.upsert({
      where: { phone },
      create: { phone, pushName: fromMe ? undefined : data.pushName },
      update: fromMe ? {} : { pushName: data.pushName ?? undefined },
    });

    const timestamp = data.messageTimestamp
      ? new Date(Number(data.messageTimestamp) * 1000)
      : new Date();

    const conversation = await this.prisma.conversation.upsert({
      where: {
        contactId_instanceId: { contactId: contact.id, instanceId: instance.id },
      },
      create: {
        contactId: contact.id,
        instanceId: instance.id,
        status: 'PENDING',
        lastMessageAt: timestamp,
        unreadCount: fromMe ? 0 : 1,
      },
      update: {
        lastMessageAt: timestamp,
        ...(fromMe ? {} : { unreadCount: { increment: 1 } }),
      },
    });

    await this.ensureDealInPipeline(contact);

    const { type, content, mediaUrl } = this.extractContent(data);

    await this.prisma.message
      .create({
        data: {
          conversationId: conversation.id,
          direction: fromMe ? 'OUTBOUND' : 'INBOUND',
          type,
          content,
          mediaUrl,
          externalId: key.id ?? undefined,
          status: fromMe ? 'SENT' : 'DELIVERED',
          timestamp,
        },
      })
      .catch((err: unknown) => {
        // externalId unico: mensagem duplicada reenviada pela Evolution
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        )
          return;
        throw err;
      });
  }

  /**
   * CRM: todo contato que conversa entra automaticamente como card na
   * primeira etapa do primeiro funil (se existir e ele ainda nao tiver card).
   */
  private async ensureDealInPipeline(contact: {
    id: string;
    name: string | null;
    pushName: string | null;
    phone: string;
  }) {
    const existing = await this.prisma.deal.findFirst({
      where: { contactId: contact.id },
      select: { id: true },
    });
    if (existing) return;

    const pipeline = await this.prisma.pipeline.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
    });
    const firstStage = pipeline?.stages[0];
    if (!firstStage) return;

    await this.prisma.deal.create({
      data: {
        title: contact.name ?? contact.pushName ?? contact.phone,
        stageId: firstStage.id,
        contactId: contact.id,
      },
    });
  }

  private async onMessagesUpdate(payload: EvolutionWebhookPayload) {
    const items = Array.isArray(payload.data) ? payload.data : [payload.data];
    for (const item of items) {
      const externalId = item?.keyId ?? item?.key?.id;
      const statusRaw = (item?.status ?? '').toString().toUpperCase();
      const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ'> = {
        SERVER_ACK: 'SENT',
        DELIVERY_ACK: 'DELIVERED',
        READ: 'READ',
      };
      const status = statusMap[statusRaw];
      if (!externalId || !status) continue;
      await this.prisma.message.updateMany({
        where: { externalId },
        data: { status },
      });
    }
  }

  private async onContactsUpsert(payload: EvolutionWebhookPayload) {
    const items = Array.isArray(payload.data) ? payload.data : [payload.data];
    for (const item of items) {
      const jid: string | undefined = item?.remoteJid ?? item?.id;
      if (!jid || !jid.endsWith('@s.whatsapp.net')) continue;
      const phone = jid.replace('@s.whatsapp.net', '');
      await this.prisma.contact.upsert({
        where: { phone },
        create: {
          phone,
          pushName: item.pushName ?? undefined,
          avatarUrl: item.profilePicUrl ?? undefined,
        },
        update: {
          pushName: item.pushName ?? undefined,
          avatarUrl: item.profilePicUrl ?? undefined,
        },
      });
    }
  }

  private extractContent(data: any): {
    type: MessageType;
    content?: string;
    mediaUrl?: string;
  } {
    const msg = data?.message ?? {};
    if (msg.conversation) return { type: 'TEXT', content: msg.conversation };
    if (msg.extendedTextMessage?.text)
      return { type: 'TEXT', content: msg.extendedTextMessage.text };
    if (msg.imageMessage)
      return {
        type: 'IMAGE',
        content: msg.imageMessage.caption,
        mediaUrl: msg.imageMessage.url,
      };
    if (msg.videoMessage)
      return {
        type: 'VIDEO',
        content: msg.videoMessage.caption,
        mediaUrl: msg.videoMessage.url,
      };
    if (msg.audioMessage)
      return { type: 'AUDIO', mediaUrl: msg.audioMessage.url };
    if (msg.documentMessage)
      return {
        type: 'DOCUMENT',
        content: msg.documentMessage.fileName,
        mediaUrl: msg.documentMessage.url,
      };
    if (msg.stickerMessage)
      return { type: 'STICKER', mediaUrl: msg.stickerMessage.url };
    if (msg.locationMessage)
      return {
        type: 'LOCATION',
        content: `${msg.locationMessage.degreesLatitude},${msg.locationMessage.degreesLongitude}`,
      };
    if (msg.contactMessage)
      return { type: 'CONTACT', content: msg.contactMessage.displayName };
    return { type: 'OTHER', content: data?.messageType };
  }
}
