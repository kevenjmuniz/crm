import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { phone: string; name?: string; email?: string }) {
    return this.prisma.contact.upsert({
      where: { phone: data.phone },
      create: data,
      update: { name: data.name, email: data.email },
    });
  }

  findAll(params: { search?: string; tagId?: string; page?: number; perPage?: number }) {
    const { search, tagId, page = 1, perPage = 50 } = params;
    const where: Prisma.ContactWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { pushName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {}),
    };
    return this.prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        notes: { orderBy: { createdAt: 'desc' } },
        deals: { include: { stage: true } },
      },
    });
    if (!contact) throw new NotFoundException('Contato nao encontrado');
    return contact;
  }

  async update(id: string, data: { name?: string; email?: string }) {
    await this.findOne(id);
    return this.prisma.contact.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contact.delete({ where: { id } });
  }

  // ---- Tags ----

  createTag(data: { name: string; color?: string }) {
    return this.prisma.tag.upsert({
      where: { name: data.name },
      create: data,
      update: { color: data.color },
    });
  }

  listTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async addTag(contactId: string, tagId: string) {
    await this.findOne(contactId);
    return this.prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId, tagId } },
      create: { contactId, tagId },
      update: {},
    });
  }

  removeTag(contactId: string, tagId: string) {
    return this.prisma.contactTag.deleteMany({ where: { contactId, tagId } });
  }

  // ---- Notas ----

  async addNote(contactId: string, content: string, authorId?: string) {
    await this.findOne(contactId);
    return this.prisma.note.create({ data: { contactId, content, authorId } });
  }
}
