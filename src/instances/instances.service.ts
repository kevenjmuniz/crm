import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';

@Injectable()
export class InstancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
  ) {}

  async create(name: string) {
    const exists = await this.prisma.instance.findUnique({ where: { name } });
    if (exists) throw new ConflictException(`Instancia "${name}" ja existe`);

    const evolutionResponse = await this.evolution.createInstance(name);
    const instance = await this.prisma.instance.create({
      data: { name, status: 'CONNECTING' },
    });
    return { instance, evolution: evolutionResponse };
  }

  findAll() {
    return this.prisma.instance.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string) {
    const instance = await this.prisma.instance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundException('Instancia nao encontrada');
    return instance;
  }

  /** Re-registra o webhook da instancia (util apos mudar WEBHOOK_BASE_URL). */
  async refreshWebhook(id: string) {
    const instance = await this.findOne(id);
    return this.evolution.setWebhook(instance.name);
  }

  /** Retorna QR code para conectar. */
  async connect(id: string) {
    const instance = await this.findOne(id);
    return this.evolution.connect(instance.name);
  }

  async status(id: string) {
    const instance = await this.findOne(id);
    const state = await this.evolution.connectionState(instance.name);
    return { instance, state };
  }

  async logout(id: string) {
    const instance = await this.findOne(id);
    await this.evolution.logout(instance.name);
    return this.prisma.instance.update({
      where: { id },
      data: { status: 'DISCONNECTED' },
    });
  }

  async remove(id: string) {
    const instance = await this.findOne(id);
    await this.evolution.deleteInstance(instance.name).catch(() => undefined);
    return this.prisma.instance.delete({ where: { id } });
  }
}
