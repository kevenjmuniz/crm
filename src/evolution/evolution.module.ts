import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EvolutionService } from './evolution.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('EVOLUTION_BASE_URL', 'http://localhost:8080'),
        headers: { apikey: config.get<string>('EVOLUTION_API_KEY', '') },
        timeout: 30000,
      }),
    }),
  ],
  providers: [EvolutionService],
  exports: [EvolutionService],
})
export class EvolutionModule {}
