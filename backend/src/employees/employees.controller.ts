import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'HR')
  create(@Body() createEmployeeDto: CreateEmployeeDto, @Request() req: any) {
    const userId = req.user?.userId || 1;
    return this.employeesService.create(createEmployeeDto, userId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'HR')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEmployeeDto: UpdateEmployeeDto, @Request() req: any) {
    const userId = req.user?.userId || 1;
    return this.employeesService.update(id, updateEmployeeDto, userId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'HR')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user?.userId || 1;
    return this.employeesService.remove(id, userId);
  }
}
