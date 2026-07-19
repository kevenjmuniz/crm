import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { ContactsService } from './contacts.service';

class CreateContactDto {
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'phone deve ser apenas digitos com DDI, ex.: 5511999999999',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

class UpdateContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

class ListContactsQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  tagId?: string;

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

class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;
}

class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;
}

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contacts.create(dto);
  }

  @Get()
  findAll(@Query() query: ListContactsQuery) {
    return this.contacts.findAll(query);
  }

  @Get('tags')
  listTags() {
    return this.contacts.listTags();
  }

  @Post('tags')
  createTag(@Body() dto: CreateTagDto) {
    return this.contacts.createTag(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contacts.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contacts.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contacts.remove(id);
  }

  @Post(':id/tags/:tagId')
  addTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.contacts.addTag(id, tagId);
  }

  @Delete(':id/tags/:tagId')
  removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.contacts.removeTag(id, tagId);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() dto: CreateNoteDto) {
    return this.contacts.addNote(id, dto.content, dto.authorId);
  }
}
