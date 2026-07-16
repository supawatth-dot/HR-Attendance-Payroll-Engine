import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { employeeId?: number; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (query.employeeId) where.employeeId = Number(query.employeeId);
    if (query.startDate || query.endDate) {
      where.startDate = {};
      if (query.startDate) where.startDate.gte = new Date(query.startDate);
      if (query.endDate) where.startDate.lte = new Date(query.endDate);
    }
    return this.prisma.leave.findMany({
      where,
      include: { employee: { include: { department: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(data: { employeeId: number; startDate: string; endDate: string; type: string }) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) throw new BadRequestException('endDate cannot be earlier than startDate');

    // Overlap check
    const overlap = await this.prisma.leave.findFirst({
      where: {
        employeeId: data.employeeId,
        approvedBy: { not: null },
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    });
    if (overlap) {
      throw new BadRequestException('Approved leave already exists for this employee across the given dates');
    }

    return this.prisma.leave.create({
      data: {
        employeeId: data.employeeId,
        startDate: start,
        endDate: end,
        type: data.type,
      },
    });
  }

  async approve(id: number, approverId: number) {
    const leave = await this.prisma.leave.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException(`Leave #${id} not found`);
    return this.prisma.leave.update({
      where: { id },
      data: { approvedBy: approverId },
    });
  }

  async remove(id: number) {
    return this.prisma.leave.delete({ where: { id } });
  }

  /**
   * True when the employee has an approved leave covering the given date.
   * Consumed by the attendance engine to skip days spent on leave.
   */
  async isOnLeave(employeeId: number, date: Date): Promise<boolean> {
    const leave = await this.prisma.leave.findFirst({
      where: {
        employeeId,
        approvedBy: { not: null },
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
    return leave !== null;
  }
}
