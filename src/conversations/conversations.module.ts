import { Module } from '@nestjs/common';
import { EvolutionModule } from '../evolution/evolution.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [EvolutionModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
