import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CompanySettingsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.companySetting.findMany();
  }

  async findOne(key: string) {
    const setting = await this.prisma.companySetting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting ${key} not found`);
    return setting;
  }

  async set(key: string, value: string, userId: number) {
    const old = await this.prisma.companySetting.findUnique({ where: { key } });
    const setting = await this.prisma.companySetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    await this.auditService.record('CompanySetting', 0, old ? 'UPDATE' : 'CREATE', userId, old, setting, `Setting ${key} changed`);
    return setting;
  }
}
