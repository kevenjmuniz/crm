import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    since7d.setHours(0, 0, 0, 0);

    const [
      convByStatus,
      contactsTotal,
      contactsNew7d,
      campaignsByStatus,
      instances,
      messagesPerDay,
      unreadTotal,
    ] = await Promise.all([
      this.prisma.conversation.groupBy({ by: ['status'], _count: true }),
      this.prisma.contact.count(),
      this.prisma.contact.count({ where: { createdAt: { gte: since7d } } }),
      this.prisma.campaign.groupBy({ by: ['status'], _count: true }),
      this.prisma.instance.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { conversations: true } },
        },
      }),
      this.prisma.$queryRaw<
        { day: Date; direction: string; total: bigint }[]
      >`SELECT date_trunc('day', "timestamp") AS day, "direction"::text AS direction, COUNT(*) AS total
        FROM "Message"
        WHERE "timestamp" >= ${since7d}
        GROUP BY 1, 2
        ORDER BY 1`,
      this.prisma.conversation.aggregate({ _sum: { unreadCount: true } }),
    ]);

    return {
      conversations: Object.fromEntries(
        convByStatus.map((c) => [c.status, c._count]),
      ),
      unreadTotal: unreadTotal._sum.unreadCount ?? 0,
      contacts: { total: contactsTotal, new7d: contactsNew7d },
      campaigns: Object.fromEntries(
        campaignsByStatus.map((c) => [c.status, c._count]),
      ),
      instances,
      messagesPerDay: messagesPerDay.map((m) => ({
        day: m.day,
        direction: m.direction,
        total: Number(m.total),
      })),
    };
  }
}
