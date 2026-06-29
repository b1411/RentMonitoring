import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const DUE_DAYS = 5;

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** ТЗ §5.1 — every 30 min: expired bookings (BOOKED, no active contract) → FREE. */
  @Cron('*/30 * * * *')
  async handleExpiredBookings() {
    const expired = await this.prisma.room.findMany({
      where: {
        currentStatus: 'BOOKED',
        contracts: { none: { isActive: true } },
      },
      select: { id: true },
    });
    if (expired.length > 0) {
      await this.prisma.room.updateMany({
        where: { id: { in: expired.map((r) => r.id) } },
        data: { currentStatus: 'FREE' },
      });
    }
    this.logger.log(`handleExpiredBookings: freed ${expired.length} room(s)`);
    return { freed: expired.length };
  }

  /** ТЗ §5.2 — 1st of month 00:00: monthly invoice per active contract (area × basePrice). */
  @Cron('0 0 1 * *')
  async generateMonthlyInvoices() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + DUE_DAYS);

    const contracts = await this.prisma.contract.findMany({
      where: { isActive: true },
      include: { room: true },
    });

    let created = 0;
    for (const contract of contracts) {
      const already = await this.prisma.invoice.findFirst({
        where: { contractId: contract.id, createdAt: { gte: monthStart } },
        select: { id: true },
      });
      if (already) continue;

      const amount = contract.room.basePrice.mul(contract.room.area);
      await this.prisma.invoice.create({
        data: { contractId: contract.id, amount, dueDate, status: 'UNPAID' },
      });
      created += 1;
    }
    this.logger.log(`generateMonthlyInvoices: created ${created} invoice(s)`);
    return { created };
  }

  /** ТЗ §5.3 — nightly 00:05: UNPAID & past due → room OVERDUE + notify. */
  @Cron('5 0 * * *')
  async checkOverdueInvoices() {
    const overdue = await this.prisma.invoice.findMany({
      where: { status: 'UNPAID', dueDate: { lt: new Date() } },
      include: { contract: { select: { roomId: true } } },
    });

    const roomIds = [...new Set(overdue.map((i) => i.contract.roomId))];
    if (roomIds.length > 0) {
      await this.prisma.room.updateMany({
        where: { id: { in: roomIds }, currentStatus: { not: 'OVERDUE' } },
        data: { currentStatus: 'OVERDUE' },
      });
      for (const roomId of roomIds) {
        // TODO: wire real push/messenger gateway. For now log the trigger (ТЗ §5.3).
        this.logger.warn(`OVERDUE notification → room ${roomId}`);
      }
    }
    this.logger.log(`checkOverdueInvoices: flagged ${roomIds.length} room(s)`);
    return { overdueRooms: roomIds.length };
  }
}
