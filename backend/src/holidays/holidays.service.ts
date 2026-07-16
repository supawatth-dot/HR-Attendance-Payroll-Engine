import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HolidaysService {
  constructor(private prisma: PrismaService) {}

  async findAll(year?: number) {
    const where: any = {};
    if (year) {
      where.date = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      };
    }
    return this.prisma.holiday.findMany({ where, orderBy: { date: 'asc' } });
  }

  async isHoliday(date: Date): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const count = await this.prisma.holiday.count({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
    });
    return count > 0;
  }

  async create(data: { date: string; description: string; isPublic?: boolean }) {
    return this.prisma.holiday.create({
      data: {
        date: new Date(data.date),
        description: data.description,
        isPublic: data.isPublic ?? true,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.holiday.delete({ where: { id } });
  }
}
