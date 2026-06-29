import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateContractInput, UpdateContractInput } from './contracts.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  /** New active contract → room becomes OCCUPIED, atomically (ТЗ §6). */
  async create(input: CreateContractInput) {
    const [room, tenant] = await Promise.all([
      this.prisma.room.findUnique({
        where: { id: input.roomId },
        select: { id: true },
      }),
      this.prisma.tenant.findUnique({
        where: { id: input.tenantId },
        select: { id: true },
      }),
    ]);
    if (!room) throw new NotFoundException(`Room ${input.roomId} not found`);
    if (!tenant)
      throw new NotFoundException(`Tenant ${input.tenantId} not found`);

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({ data: input });
      if (contract.isActive) {
        await tx.room.update({
          where: { id: input.roomId },
          data: { currentStatus: 'OCCUPIED' },
        });
      }
      return contract;
    });
  }

  findAll(roomId?: string, tenantId?: string) {
    return this.prisma.contract.findMany({
      where: { roomId: roomId ?? undefined, tenantId: tenantId ?? undefined },
      orderBy: { startDate: 'desc' },
      include: {
        tenant: true,
        room: true,
        _count: { select: { invoices: true } },
      },
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        tenant: true,
        room: true,
        invoices: { orderBy: { dueDate: 'desc' } },
      },
    });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return contract;
  }

  async update(id: string, data: UpdateContractInput) {
    await this.findOne(id);
    return this.prisma.contract.update({ where: { id }, data });
  }

  /** Delete contract → room rolls back to FREE in one transaction (ТЗ QA). */
  async remove(id: string) {
    const contract = await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.contract.delete({ where: { id } });
      await tx.room.update({
        where: { id: contract.roomId },
        data: { currentStatus: 'FREE' },
      });
      return { id };
    });
  }
}
