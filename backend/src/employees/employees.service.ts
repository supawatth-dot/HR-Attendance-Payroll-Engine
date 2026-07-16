import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(query: { departmentId?: number; shiftId?: number; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.departmentId) where.departmentId = Number(query.departmentId);
    if (query.shiftId) where.shiftId = Number(query.shiftId);

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: { department: true, shift: true },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { department: true, shift: true },
    });
    if (!employee) throw new NotFoundException(`Employee #${id} not found`);
    return employee;
  }

  async create(dto: CreateEmployeeDto, userId: number) {
    const employee = await this.prisma.employee.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        departmentId: dto.departmentId,
        shiftId: dto.shiftId,
        hireDate: new Date(dto.hireDate),
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : null,
      },
      include: { department: true, shift: true },
    });

    await this.auditService.record('Employee', employee.id, 'CREATE', userId, null, employee);
    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto, userId: number) {
    const oldEmp = await this.findOne(id);
    const data: any = { ...dto };
    if (dto.hireDate) data.hireDate = new Date(dto.hireDate);
    if (dto.terminationDate) data.terminationDate = new Date(dto.terminationDate);

    const updated = await this.prisma.employee.update({
      where: { id },
      data,
      include: { department: true, shift: true },
    });

    await this.auditService.record('Employee', id, 'UPDATE', userId, oldEmp, updated);
    return updated;
  }

  async remove(id: number, userId: number) {
    const oldEmp = await this.findOne(id);
    await this.prisma.employee.delete({ where: { id } });
    await this.auditService.record('Employee', id, 'DELETE', userId, oldEmp, null);
    return { success: true, message: `Deleted employee #${id}` };
  }
}
