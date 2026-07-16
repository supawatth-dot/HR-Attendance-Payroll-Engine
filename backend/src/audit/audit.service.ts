import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async record(
    tableName: string,
    recordId: number,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    changedBy: number,
    oldValue?: any,
    newValue?: any,
    reason?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tableName,
          recordId,
          operation,
          changedBy,
          oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
          newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
          reason: reason || null,
        },
      });
    } catch (err) {
      console.error(`[AuditService] Failed to log audit event for ${tableName}#${recordId}:`, err);
    }
  }

  async queryLogs(filters: { tableName?: string; recordId?: number; from?: string; to?: string; changedBy?: number }) {
    const where: any = {};
    if (filters.tableName) where.tableName = filters.tableName;
    if (filters.recordId) where.recordId = Number(filters.recordId);
    if (filters.changedBy) where.changedBy = Number(filters.changedBy);
    if (filters.from || filters.to) {
      where.timestamp = {};
      if (filters.from) where.timestamp.gte = new Date(filters.from);
      if (filters.to) where.timestamp.lte = new Date(filters.to);
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 200,
    });
  }
}
