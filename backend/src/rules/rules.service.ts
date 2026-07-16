import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RuleEngineService } from './rule-engine.service';
import { CreateRuleVersionDto } from './dto/create-rule-version.dto';

@Injectable()
export class RulesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private ruleEngine: RuleEngineService,
  ) {}

  async getCategories() {
    return this.prisma.ruleCategory.findMany({
      include: { definitions: true },
      orderBy: { id: 'asc' },
    });
  }

  async getDefinitions(categoryId?: number) {
    const where: any = {};
    if (categoryId) where.categoryId = Number(categoryId);
    return this.prisma.ruleDefinition.findMany({
      where,
      include: { category: true, versions: { orderBy: { effectiveFrom: 'desc' } } },
    });
  }

  async getVersions(definitionId?: number) {
    const where: any = {};
    if (definitionId) where.definitionId = Number(definitionId);
    return this.prisma.ruleVersion.findMany({
      where,
      include: { definition: true, values: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async createVersion(dto: CreateRuleVersionDto, userId: number) {
    const version = await this.prisma.ruleVersion.create({
      data: {
        definitionId: dto.definitionId,
        versionNumber: dto.versionNumber,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        values: {
          create: dto.values.map(v => ({
            key: v.key,
            value: v.value,
            valueType: v.valueType,
          })),
        },
      },
      include: { values: true },
    });

    await this.auditService.record('RuleVersion', version.id, 'CREATE', userId, null, version);
    return version;
  }

  async getValues(versionId: number) {
    return this.prisma.ruleValue.findMany({
      where: { ruleVersionId: versionId },
      orderBy: { key: 'asc' },
    });
  }

  async upsertValues(versionId: number, values: Array<{ id?: number; key: string; value: string; valueType: string }>, userId: number) {
    const oldVersion = await this.prisma.ruleVersion.findUnique({ where: { id: versionId }, include: { values: true } });
    if (!oldVersion) throw new NotFoundException(`RuleVersion #${versionId} not found`);

    // Delete existing and replace to keep it clean, or upsert one by one
    await this.prisma.ruleValue.deleteMany({ where: { ruleVersionId: versionId } });
    const updatedValues = await Promise.all(
      values.map(v =>
        this.prisma.ruleValue.create({
          data: {
            ruleVersionId: versionId,
            key: v.key,
            value: v.value,
            valueType: v.valueType,
          },
        }),
      ),
    );

    await this.auditService.record('RuleVersion', versionId, 'UPDATE', userId, oldVersion.values, updatedValues);
    return updatedValues;
  }
}
