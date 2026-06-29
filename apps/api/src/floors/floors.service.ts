import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFloorInput, UpdateFloorInput } from './floors.dto';

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateFloorInput) {
    return this.prisma.floor.create({ data });
  }

  findAll(buildingId?: string) {
    return this.prisma.floor.findMany({
      where: buildingId ? { buildingId } : undefined,
      orderBy: { floorNumber: 'asc' },
      include: { _count: { select: { rooms: true } } },
    });
  }

  /** Full floor payload for the interactive map: plan + all room polygons. */
  async findOne(id: string) {
    const floor = await this.prisma.floor.findUnique({
      where: { id },
      include: {
        building: true,
        rooms: {
          orderBy: { roomNumber: 'asc' },
          include: {
            contracts: {
              where: { isActive: true },
              include: { tenant: true },
            },
          },
        },
      },
    });
    if (!floor) throw new NotFoundException(`Floor ${id} not found`);
    return floor;
  }

  async update(id: string, data: UpdateFloorInput) {
    await this.ensureExists(id);
    return this.prisma.floor.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.floor.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const floor = await this.prisma.floor.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!floor) throw new NotFoundException(`Floor ${id} not found`);
  }
}
