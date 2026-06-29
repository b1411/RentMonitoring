import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBuildingInput, UpdateBuildingInput } from './buildings.dto';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateBuildingInput) {
    return this.prisma.building.create({ data });
  }

  findAll() {
    return this.prisma.building.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { floors: true } } },
    });
  }

  async findOne(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: { floors: { orderBy: { floorNumber: 'asc' } } },
    });
    if (!building) throw new NotFoundException(`Building ${id} not found`);
    return building;
  }

  async update(id: string, data: UpdateBuildingInput) {
    await this.findOne(id);
    return this.prisma.building.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.building.delete({ where: { id } });
  }
}
