import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';
import { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
  ) {}

  /** Inicia (ou reabre) uma conversa com um numero qualquer. */
  async start(dto: {
    phone: string;
    instanceId: string;
    text?: string;
    sentById?: string;
  }) {
    const instance = await this.prisma.instance.findUnique({
      where: { id: dto.instanceId },
    });
    if (!instance) throw new NotFoundException('Instancia nao encontrada');

    const contact = await this.prisma.contact.upsert({
      where: { phone: dto.phone },
      create: { phone: dto.phone },
      update: {},
    });

    const conversation = await this.prisma.conversation.upsert({
      where: {
        contactId_instanceId: {
          contactId: contact.id,
          instanceId: instance.id,
        },
      },
      create: {
        contactId: contact.id,
        instanceId: instance.id,
        status: 'OPEN',
      },
      update: { status: 'OPEN' },
    });

    await this.ensureDealInPipeline(contact);

    if (dto.text) {
      await this.sendMessage(conversation.id, {
        text: dto.text,
        sentById: dto.sentById,
      });
    }
    return this.findOne(conversation.id);
  }

  /** Contato que entra em conversa vira card na primeira etapa do funil. */
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

  async findAll(
    params: {
      status?: ConversationStatus;
      queueId?: string;
      assignedToId?: string;
      page?: number;
      perPage?: number;
    },
    user?: AuthUser,
  ) {
    const { status, queueId, assignedToId, page = 1, perPage = 50 } = params;
    const where: Prisma.ConversationWhereInput = {
      ...(status ? { status } : {}),
      ...(queueId ? { queueId } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    };

    // Atendente comum: so ve as suas + as das filas dele + a caixa geral
    // (sem atendente e sem fila), para poder captar atendimentos novos.
    if (user && user.role === 'AGENT') {
      const myQueues = await this.prisma.queueUser.findMany({
        where: { userId: user.id },
        select: { queueId: true },
      });
      const queueIds = myQueues.map((q) => q.queueId);
      where.OR = [
        { assignedToId: user.id },
        ...(queueIds.length ? [{ queueId: { in: queueIds } }] : []),
        { assignedToId: null, queueId: null },
      ];
    }

    return this.prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
        queue: true,
        instance: { select: { id: true, name: true, status: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });
  }

  async findOne(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: { contact: true, assignedTo: true, queue: true, instance: true },
    });
    if (!conversation) throw new NotFoundException('Conversa nao encontrada');
    return conversation;
  }

  listMessages(id: string, params: { page?: number; perPage?: number }) {
    const { page = 1, perPage = 50 } = params;
    return this.prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });
  }

  /** Baixa a midia de uma mensagem (imagem/audio/video/documento) em base64. */
  async getMessageMedia(conversationId: string, messageId: string) {
    const conversation = await this.findOne(conversationId);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId },
    });
    if (!message) throw new NotFoundException('Mensagem nao encontrada');
    if (!message.externalId) {
      throw new BadRequestException('Mensagem sem midia disponivel');
    }
    return this.evolution.getMediaBase64(
      conversation.instance.name,
      message.externalId,
    );
  }

  /** Atribui a um atendente e/ou fila; abre a conversa. */
  async assign(id: string, data: { assignedToId?: string; queueId?: string }) {
    await this.findOne(id);
    return this.prisma.conversation.update({
      where: { id },
      data: { ...data, status: 'OPEN' },
    });
  }

  async updateStatus(id: string, status: ConversationStatus) {
    await this.findOne(id);
    return this.prisma.conversation.update({ where: { id }, data: { status } });
  }

  async markRead(id: string) {
    await this.findOne(id);
    return this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  /** Envia mensagem de texto ou midia pelo WhatsApp e registra no historico. */
  async sendMessage(
    id: string,
    dto: { text?: string; mediaUrl?: string; caption?: string; sentById?: string },
  ) {
    if (!dto.text && !dto.mediaUrl) {
      throw new BadRequestException('Informe text ou mediaUrl');
    }
    const conversation = await this.findOne(id);
    const number = conversation.contact.phone;
    const instanceName = conversation.instance.name;

    const result = dto.mediaUrl
      ? await this.evolution.sendMedia(instanceName, number, dto.mediaUrl, {
          caption: dto.caption,
        })
      : await this.evolution.sendText(instanceName, number, dto.text!);

    const externalId = (result as any)?.key?.id as string | undefined;

    const message = await this.prisma.message.create({
      data: {
        conversationId: id,
        direction: 'OUTBOUND',
        type: dto.mediaUrl ? 'IMAGE' : 'TEXT',
        content: dto.text ?? dto.caption,
        mediaUrl: dto.mediaUrl,
        externalId,
        status: 'SENT',
        sentById: dto.sentById,
      },
    });

    await this.prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date(), status: 'OPEN' },
    });

    return message;
  }
}
