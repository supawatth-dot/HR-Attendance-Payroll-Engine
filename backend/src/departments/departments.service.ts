import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DepartmentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException(`Department #${id} not found`);
    return dept;
  }

  async create(data: { name: string; managerId?: number }, userId: number) {
    const dept = await this.prisma.department.create({ data });
    await this.auditService.record('Department', dept.id, 'CREATE', userId, null, dept);
    return dept;
  }

  async update(id: number, data: { name?: string; managerId?: number }, userId: number) {
    const oldDept = await this.findOne(id);
    const updated = await this.prisma.department.update({ where: { id }, data });
    await this.auditService.record('Department', id, 'UPDATE', userId, oldDept, updated);
    return updated;
  }

  async remove(id: number, userId: number) {
    const oldDept = await this.findOne(id);
    await this.prisma.department.delete({ where: { id } });
    await this.auditService.record('Department', id, 'DELETE', userId, oldDept, null);
    return { success: true };
  }
}
