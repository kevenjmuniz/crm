import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
  ) {}

  findAll(params: {
    status?: ConversationStatus;
    queueId?: string;
    assignedToId?: string;
    page?: number;
    perPage?: number;
  }) {
    const { status, queueId, assignedToId, page = 1, perPage = 50 } = params;
    const where: Prisma.ConversationWhereInput = {
      ...(status ? { status } : {}),
      ...(queueId ? { queueId } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    };
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
