import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';
import { CAMPAIGN_QUEUE } from './campaigns.module';
import { CampaignJobData } from './campaigns.service';

@Processor(CAMPAIGN_QUEUE, { concurrency: 1 })
export class CampaignsProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>) {
    const { campaignId, recipientId } = job.data;

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { instance: true },
    });
    if (!campaign) return;

    // pausada/cancelada: pula sem marcar erro (job nao sera reenfileirado)
    if (campaign.status === 'PAUSED' || campaign.status === 'FAILED') {
      return;
    }
    if (campaign.status === 'SCHEDULED') {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'RUNNING' },
      });
    }

    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
      include: { contact: true },
    });
    if (!recipient || recipient.status !== 'PENDING') return;

    try {
      if (campaign.mediaUrl) {
        await this.evolution.sendMedia(
          campaign.instance.name,
          recipient.contact.phone,
          campaign.mediaUrl,
          { caption: campaign.message },
        );
      } else {
        await this.evolution.sendText(
          campaign.instance.name,
          recipient.contact.phone,
          campaign.message,
        );
      }
      await this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (isLastAttempt) {
        await this.prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { status: 'FAILED', error: (err as Error).message?.slice(0, 500) },
        });
      }
      throw err;
    } finally {
      await this.completeIfDone(campaignId);
    }
  }

  private async completeIfDone(campaignId: string) {
    const pending = await this.prisma.campaignRecipient.count({
      where: { campaignId, status: 'PENDING' },
    });
    if (pending === 0) {
      await this.prisma.campaign.updateMany({
        where: { id: campaignId, status: { in: ['RUNNING', 'SCHEDULED'] } },
        data: { status: 'COMPLETED' },
      });
      this.logger.log(`Campanha ${campaignId} concluida`);
    }
  }
}
