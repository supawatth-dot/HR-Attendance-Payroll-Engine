import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('run')
  @Roles('ADMIN', 'HR')
  async runEngine(@Body() body: { startDate: string; endDate: string }) {
    await this.attendanceService.runForDateRange(new Date(body.startDate), new Date(body.endDate));
    return { success: true, message: `Engine execution triggered for ${body.startDate} to ${body.endDate}` };
  }

  @Get('results')
  async getResults(
    @Query('employeeId') employeeId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('missingClock') missingClock?: string,
    @Query('isAbsent') isAbsent?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Request() req?: any,
  ) {
    const userRole = req?.user?.role;
    let employeeIds: number[] | undefined;

    if (userRole === 'EMPLOYEE') {
      employeeIds = [req.user.userId];
    } else if (employeeId) {
      employeeIds = [Number(employeeId)];
    }

    return this.attendanceService.getResults({
      employeeIds,
      dateFrom: startDate ? new Date(startDate) : undefined,
      dateTo: endDate ? new Date(endDate) : undefined,
      missingClock: missingClock !== undefined ? missingClock === 'true' : undefined,
      isAbsent: isAbsent !== undefined ? isAbsent === 'true' : undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
    });
  }
}
