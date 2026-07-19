import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EvolutionModule } from '../evolution/evolution.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignsProcessor } from './campaigns.processor';

export const CAMPAIGN_QUEUE = 'campaign-dispatch';

@Module({
  imports: [
    BullModule.registerQueue({ name: CAMPAIGN_QUEUE }),
    EvolutionModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignsProcessor],
})
export class CampaignsModule {}
