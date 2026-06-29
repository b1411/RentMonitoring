import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateRoomInput,
  UpdateRoomInput,
  UpdateRoomStatusInput,
} from './rooms.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateRoomInput) {
    const { coordinates, ...rest } = input;
    return this.prisma.room.create({
      data: { ...rest, polygonCoordinates: coordinates },
    });
  }

  findAll(floorId?: string) {
    return this.prisma.room.findMany({
      where: floorId ? { floorId } : undefined,
      orderBy: { roomNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        floor: { include: { building: true } },
        contracts: {
          orderBy: { startDate: 'desc' },
          include: { tenant: true, invoices: { orderBy: { dueDate: 'desc' } } },
        },
      },
    });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    return room;
  }

  async update(id: string, input: UpdateRoomInput) {
    await this.ensureExists(id);
    const { coordinates, ...rest } = input;
    return this.prisma.room.update({
      where: { id },
      data: {
        ...rest,
        ...(coordinates ? { polygonCoordinates: coordinates } : {}),
      },
    });
  }

  async updateStatus(id: string, { currentStatus }: UpdateRoomStatusInput) {
    await this.ensureExists(id);
    return this.prisma.room.update({ where: { id }, data: { currentStatus } });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.room.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
  }
}
