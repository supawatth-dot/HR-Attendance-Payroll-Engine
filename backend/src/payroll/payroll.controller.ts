import { Controller, Get, Post, Body, Param, Query, Res, UseGuards, Request, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { PayrollExportService } from './payroll-export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly exportService: PayrollExportService,
  ) {}

  @Get('batches')
  async getBatches() {
    return this.payrollService['prisma'].payrollBatch.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { id: 'desc' },
    });
  }

  @Post('generate')
  @Roles('ADMIN', 'HR')
  async generate(@Body() body: { periodStart: string; periodEnd: string }, @Request() req: any) {
    return this.payrollService.generateBatch(new Date(body.periodStart), new Date(body.periodEnd), req.user?.userId || 1);
  }

  @Get('batches/:id/export')
  async exportBatch(@Param('id', ParseIntPipe) id: number, @Query('format') format: string = 'xlsx', @Res() res: Response) {
    let buffer: Buffer;
    let contentType: string;
    let extension: string;

    if (format === 'pdf') {
      buffer = await this.exportService.exportToPdf(id);
      contentType = 'application/pdf';
      extension = 'pdf';
    } else if (format === 'csv') {
      buffer = await this.exportService.exportToCsv(id);
      contentType = 'text/csv';
      extension = 'csv';
    } else {
      buffer = await this.exportService.exportToExcel(id);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="payroll-batch-${id}.${extension}"`);
    res.send(buffer);
  }
}
