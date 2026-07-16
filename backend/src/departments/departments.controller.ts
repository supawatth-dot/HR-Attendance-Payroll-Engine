import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'HR')
  create(@Body() body: { name: string; managerId?: number }, @Request() req: any) {
    return this.departmentsService.create(body, req.user?.userId || 1);
  }

  @Patch(':id')
  @Roles('ADMIN', 'HR')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: { name?: string; managerId?: number }, @Request() req: any) {
    return this.departmentsService.update(id, body, req.user?.userId || 1);
  }

  @Delete(':id')
  @Roles('ADMIN', 'HR')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.departmentsService.remove(id, req.user?.userId || 1);
  }
}
