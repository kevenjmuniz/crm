import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { CampaignsService } from './campaigns.service';

class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  instanceId!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  ratePerMinute?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  contactIds?: string[];

  @IsOptional()
  @IsUUID()
  tagId?: string;
}

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaigns.create(dto);
  }

  @Get()
  findAll() {
    return this.campaigns.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaigns.findOne(id);
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.campaigns.start(id);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string) {
    return this.campaigns.pause(id);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string) {
    return this.campaigns.resume(id);
  }
}
