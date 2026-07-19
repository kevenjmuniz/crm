import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { InstancesService } from './instances.service';

class CreateInstanceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'name deve conter apenas letras, numeros, hifen e underscore',
  })
  name!: string;
}

@Controller('instances')
export class InstancesController {
  constructor(private readonly instances: InstancesService) {}

  @Post()
  create(@Body() dto: CreateInstanceDto) {
    return this.instances.create(dto.name);
  }

  @Get()
  findAll() {
    return this.instances.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.instances.findOne(id);
  }

  @Get(':id/qrcode')
  connect(@Param('id') id: string) {
    return this.instances.connect(id);
  }

  @Get(':id/status')
  status(@Param('id') id: string) {
    return this.instances.status(id);
  }

  @Post(':id/logout')
  logout(@Param('id') id: string) {
    return this.instances.logout(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.instances.remove(id);
  }
}
