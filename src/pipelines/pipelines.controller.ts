import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PipelinesService } from './pipelines.service';

class CreatePipelineDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  stages!: string[];
}

class AddStageDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

class CreateDealDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsUUID()
  stageId!: string;

  @IsUUID()
  contactId!: string;

  @IsOptional()
  @IsNumber()
  value?: number;
}

class MoveDealDto {
  @IsUUID()
  stageId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelines: PipelinesService) {}

  @Post()
  create(@Body() dto: CreatePipelineDto) {
    return this.pipelines.create(dto);
  }

  @Get()
  findAll() {
    return this.pipelines.findAll();
  }

  @Get(':id/board')
  board(@Param('id') id: string) {
    return this.pipelines.board(id);
  }

  @Post(':id/stages')
  addStage(@Param('id') id: string, @Body() dto: AddStageDto) {
    return this.pipelines.addStage(id, dto.name);
  }

  @Post('deals')
  createDeal(@Body() dto: CreateDealDto) {
    return this.pipelines.createDeal(dto);
  }

  @Patch('deals/:dealId/move')
  moveDeal(@Param('dealId') dealId: string, @Body() dto: MoveDealDto) {
    return this.pipelines.moveDeal(dealId, dto);
  }

  @Delete('deals/:dealId')
  removeDeal(@Param('dealId') dealId: string) {
    return this.pipelines.removeDeal(dealId);
  }
}
