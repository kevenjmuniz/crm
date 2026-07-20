import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Min,
} from 'class-validator';
import { ConversationStatus } from '@prisma/client';
import { ConversationsService } from './conversations.service';

class ListConversationsQuery {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsUUID()
  queueId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perPage?: number;
}

class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perPage?: number;
}

class AssignDto {
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  queueId?: string;
}

class UpdateStatusDto {
  @IsEnum(ConversationStatus)
  status!: ConversationStatus;
}

class SendMessageDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsUUID()
  sentById?: string;
}

class StartConversationDto {
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'phone deve ser apenas digitos com DDI, ex.: 5511999999999',
  })
  phone!: string;

  @IsUUID()
  instanceId!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsUUID()
  sentById?: string;
}

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Post()
  start(@Body() dto: StartConversationDto) {
    return this.conversations.start(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query() query: ListConversationsQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.conversations.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversations.findOne(id);
  }

  @Get(':id/messages')
  listMessages(@Param('id') id: string, @Query() query: PaginationQuery) {
    return this.conversations.listMessages(id, query);
  }

  @Post(':id/messages')
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.conversations.sendMessage(id, dto);
  }

  @Get(':id/messages/:messageId/media')
  getMedia(@Param('id') id: string, @Param('messageId') messageId: string) {
    return this.conversations.getMessageMedia(id, messageId);
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignDto) {
    return this.conversations.assign(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.conversations.updateStatus(id, dto.status);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string) {
    return this.conversations.markRead(id);
  }
}
