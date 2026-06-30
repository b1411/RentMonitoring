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

  /**
   * Floor payload for the interactive map: plan + room polygons.
   * Staff (`includeSensitive: true`) get tenants + rent + the full 5-state status.
   * Clients get a listing view — area + price, but status collapsed to FREE/OCCUPIED
   * so they never learn who is booked, in repair, or overdue (ТЗ §Б: client vs manager).
   */
  async findOne(id: string, opts: { includeSensitive: boolean }) {
    if (opts.includeSensitive) {
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

    const floor = await this.prisma.floor.findUnique({
      where: { id },
      select: {
        id: true,
        buildingId: true,
        floorNumber: true,
        planImageUrl: true,
        building: { select: { id: true, name: true, address: true } },
        rooms: {
          orderBy: { roomNumber: 'asc' },
          select: {
            id: true,
            floorId: true,
            roomNumber: true,
            area: true,
            basePrice: true,
            polygonCoordinates: true,
            door: true,
            currentStatus: true,
          },
        },
      },
    });
    if (!floor) throw new NotFoundException(`Floor ${id} not found`);

    // Collapse to two states — anything not FREE reads simply as "occupied".
    return {
      ...floor,
      rooms: floor.rooms.map((room) => ({
        ...room,
        currentStatus: room.currentStatus === 'FREE' ? 'FREE' : 'OCCUPIED',
      })),
    };
  }

  async update(id: string, data: UpdateFloorInput) {
    await this.ensureExists(id);
    return this.prisma.floor.update({ where: { id }, data });
  }

  /** Point a floor at a freshly uploaded plan image. */
  async setPlan(id: string, planImageUrl: string) {
    await this.ensureExists(id);
    return this.prisma.floor.update({ where: { id }, data: { planImageUrl } });
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
