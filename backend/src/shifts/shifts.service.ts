import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shift.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException(`Shift #${id} not found`);
    return shift;
  }

  async create(data: { name: string; startTime: string; endTime: string; lunchBreakMinutes: number; overnight: boolean }) {
    return this.prisma.shift.create({ data });
  }

  async update(id: number, data: Partial<{ name: string; startTime: string; endTime: string; lunchBreakMinutes: number; overnight: boolean }>) {
    await this.findOne(id);
    return this.prisma.shift.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.shift.delete({ where: { id } });
  }
}
