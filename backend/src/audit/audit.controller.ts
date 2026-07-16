import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'HR')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async getLogs(
    @Query('table') tableName?: string,
    @Query('recordId') recordId?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('changedBy') changedBy?: number,
  ) {
    return this.auditService.queryLogs({ tableName, recordId, from, to, changedBy });
  }
}
