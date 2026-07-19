import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CAMPAIGN_QUEUE } from './campaigns.constants';

export interface CampaignJobData {
  campaignId: string;
  recipientId: string;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CAMPAIGN_QUEUE) private readonly queue: Queue<CampaignJobData>,
  ) {}

  /**
   * Cria campanha em rascunho. Destinatarios vem de uma lista de contactIds
   * e/ou de uma tag.
   */
  async create(data: {
    name: string;
    instanceId: string;
    message: string;
    mediaUrl?: string;
    ratePerMinute?: number;
    scheduledAt?: Date;
    contactIds?: string[];
    tagId?: string;
  }) {
    const contactIds = new Set(data.contactIds ?? []);
    if (data.tagId) {
      const tagged = await this.prisma.contactTag.findMany({
        where: { tagId: data.tagId },
        select: { contactId: true },
      });
      tagged.forEach((t) => contactIds.add(t.contactId));
    }
    if (contactIds.size === 0) {
      throw new BadRequestException(
        'Campanha sem destinatarios: informe contactIds e/ou tagId',
      );
    }

    return this.prisma.campaign.create({
      data: {
        name: data.name,
        instanceId: data.instanceId,
        message: data.message,
        mediaUrl: data.mediaUrl,
        ratePerMinute: data.ratePerMinute ?? 10,
        scheduledAt: data.scheduledAt,
        status: 'DRAFT',
        recipients: {
          create: [...contactIds].map((contactId) => ({ contactId })),
        },
      },
      include: { _count: { select: { recipients: true } } },
    });
  }

  findAll() {
    return this.prisma.campaign.findMany({
      include: {
        instance: { select: { name: true, status: true } },
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { instance: true },
    });
    if (!campaign) throw new NotFoundException('Campanha nao encontrada');
    const stats = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: true,
    });
    return { ...campaign, stats };
  }

  /**
   * Inicia o disparo: enfileira um job por destinatario com delay incremental
   * respeitando ratePerMinute (espaco entre envios evita bloqueio do numero).
   */
  async start(id: string) {
    const campaign = await this.findOne(id);
    if (campaign.status === 'RUNNING') {
      throw new BadRequestException('Campanha ja esta em execucao');
    }
    return this.enqueuePending(campaign);
  }

  private async enqueuePending(campaign: {
    id: string;
    ratePerMinute: number;
    scheduledAt: Date | null;
  }) {
    const id = campaign.id;
    const pending = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: id, status: 'PENDING' },
      select: { id: true },
    });
    if (pending.length === 0) {
      throw new BadRequestException('Nenhum destinatario pendente');
    }

    const intervalMs = Math.ceil(60000 / campaign.ratePerMinute);
    const baseDelay = campaign.scheduledAt
      ? Math.max(0, campaign.scheduledAt.getTime() - Date.now())
      : 0;

    await this.queue.addBulk(
      pending.map((r, i) => ({
        name: 'send',
        data: { campaignId: id, recipientId: r.id },
        opts: {
          delay: baseDelay + i * intervalMs,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      })),
    );

    return this.prisma.campaign.update({
      where: { id },
      data: { status: campaign.scheduledAt ? 'SCHEDULED' : 'RUNNING' },
    });
  }

  /** Pausa: o processor checa o status antes de cada envio. */
  async pause(id: string) {
    await this.findOne(id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async resume(id: string) {
    const campaign = await this.findOne(id);
    if (campaign.status !== 'PAUSED') {
      throw new BadRequestException('Campanha nao esta pausada');
    }
    return this.enqueuePending(campaign);
  }
}
