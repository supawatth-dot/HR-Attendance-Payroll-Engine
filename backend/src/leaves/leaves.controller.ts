import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.leavesService.findAll(query);
  }

  @Post()
  create(@Body() body: { employeeId: number; startDate: string; endDate: string; type: string }) {
    return this.leavesService.create(body);
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'HR', 'MANAGER')
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.leavesService.approve(id, req.user?.userId || 1);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.leavesService.remove(id);
  }
}
