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
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { TeamsService } from './teams.service';

class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  password!: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class CreateQueueDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.teams.createUser(dto);
  }

  @Get('users')
  listUsers() {
    return this.teams.listUsers();
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.teams.updateUser(id, dto);
  }

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.teams.resetPassword(id, dto.password);
  }

  @Post('queues')
  createQueue(@Body() dto: CreateQueueDto) {
    return this.teams.createQueue(dto);
  }

  @Get('queues')
  listQueues() {
    return this.teams.listQueues();
  }

  @Post('queues/:queueId/users/:userId')
  addUserToQueue(
    @Param('queueId') queueId: string,
    @Param('userId') userId: string,
  ) {
    return this.teams.addUserToQueue(queueId, userId);
  }

  @Delete('queues/:queueId/users/:userId')
  removeUserFromQueue(
    @Param('queueId') queueId: string,
    @Param('userId') userId: string,
  ) {
    return this.teams.removeUserFromQueue(queueId, userId);
  }
}
