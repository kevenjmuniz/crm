import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Usuarios / atendentes ----

  async createUser(data: {
    name: string;
    email: string;
    role?: UserRole;
    password: string;
  }) {
    const { password, ...rest } = data;
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { ...rest, passwordHash },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        queues: { include: { queue: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async resetPassword(id: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }

  async updateUser(
    id: string,
    data: { name?: string; role?: UserRole; active?: boolean },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ---- Filas / setores ----

  createQueue(data: { name: string; description?: string }) {
    return this.prisma.queue.create({ data });
  }

  listQueues() {
    return this.prisma.queue.findMany({
      include: {
        users: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  addUserToQueue(queueId: string, userId: string) {
    return this.prisma.queueUser.upsert({
      where: { queueId_userId: { queueId, userId } },
      create: { queueId, userId },
      update: {},
    });
  }

  removeUserFromQueue(queueId: string, userId: string) {
    return this.prisma.queueUser.deleteMany({ where: { queueId, userId } });
  }
}
