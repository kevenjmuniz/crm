import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Usuarios / atendentes ----

  createUser(data: { name: string; email: string; role?: UserRole }) {
    return this.prisma.user.create({ data });
  }

  listUsers() {
    return this.prisma.user.findMany({
      include: { queues: { include: { queue: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async updateUser(
    id: string,
    data: { name?: string; role?: UserRole; active?: boolean },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    return this.prisma.user.update({ where: { id }, data });
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
