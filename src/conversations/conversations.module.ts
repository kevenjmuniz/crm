import { Module } from '@nestjs/common';
import { EvolutionModule } from '../evolution/evolution.module';
import { AuthModule } from '../auth/auth.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [EvolutionModule, AuthModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
