import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cria funil com etapas iniciais na ordem informada. */
  create(data: { name: string; stages: string[] }) {
    return this.prisma.pipeline.create({
      data: {
        name: data.name,
        stages: {
          create: data.stages.map((name, position) => ({ name, position })),
        },
      },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
  }

  findAll() {
    return this.prisma.pipeline.findMany({
      include: { stages: { orderBy: { position: 'asc' } } },
    });
  }

  /** Retorna o funil em formato kanban: etapas com seus cards. */
  async board(id: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            deals: {
              orderBy: { position: 'asc' },
              include: {
                contact: {
                  select: { id: true, name: true, pushName: true, phone: true },
                },
              },
            },
          },
        },
      },
    });
    if (!pipeline) throw new NotFoundException('Funil nao encontrado');
    return pipeline;
  }

  async addStage(pipelineId: string, name: string) {
    const last = await this.prisma.stage.findFirst({
      where: { pipelineId },
      orderBy: { position: 'desc' },
    });
    return this.prisma.stage.create({
      data: { pipelineId, name, position: (last?.position ?? -1) + 1 },
    });
  }

  createDeal(data: {
    title: string;
    stageId: string;
    contactId: string;
    value?: number;
  }) {
    return this.prisma.deal.create({ data });
  }

  /** Move card entre etapas (drag-and-drop do kanban). */
  async moveDeal(dealId: string, data: { stageId: string; position?: number }) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Card nao encontrado');
    return this.prisma.deal.update({
      where: { id: dealId },
      data: { stageId: data.stageId, position: data.position ?? 0 },
    });
  }

  async removeDeal(dealId: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Card nao encontrado');
    return this.prisma.deal.delete({ where: { id: dealId } });
  }
}
