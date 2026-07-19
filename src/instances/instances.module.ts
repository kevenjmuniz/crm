import { Module } from '@nestjs/common';
import { EvolutionModule } from '../evolution/evolution.module';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';

@Module({
  imports: [EvolutionModule],
  controllers: [InstancesController],
  providers: [InstancesService],
  exports: [InstancesService],
})
export class InstancesModule {}
