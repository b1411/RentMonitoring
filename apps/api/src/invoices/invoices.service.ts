import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateInvoiceInput,
  UpdateInvoiceStatusInput,
} from './invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInvoiceInput) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: input.contractId },
      select: { id: true },
    });
    if (!contract)
      throw new NotFoundException(`Contract ${input.contractId} not found`);
    return this.prisma.invoice.create({ data: input });
  }

  findAll(contractId?: string, status?: string) {
    return this.prisma.invoice.findMany({
      where: {
        contractId: contractId ?? undefined,
        status: status === undefined ? undefined : (status as never),
      },
      orderBy: { dueDate: 'desc' },
      include: { contract: { include: { room: true, tenant: true } } },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { contract: { include: { room: true, tenant: true } } },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  /**
   * Change invoice status. Paying the last overdue invoice clears the room's
   * OVERDUE flag back to OCCUPIED — all in one transaction.
   */
  async updateStatus(id: string, { status }: UpdateInvoiceStatusInput) {
    const invoice = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: { status },
      });

      if (status === 'PAID') {
        const roomId = invoice.contract.roomId;
        const stillOverdue = await tx.invoice.count({
          where: {
            id: { not: id },
            status: 'UNPAID',
            dueDate: { lt: new Date() },
            contract: { roomId },
          },
        });
        if (
          stillOverdue === 0 &&
          invoice.contract.room.currentStatus === 'OVERDUE'
        ) {
          await tx.room.update({
            where: { id: roomId },
            data: { currentStatus: 'OCCUPIED' },
          });
        }
      }
      return updated;
    });
  }
}
