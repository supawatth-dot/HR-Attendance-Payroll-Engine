import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  findAll() {
    return this.shiftsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shiftsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'HR')
  create(@Body() body: { name: string; startTime: string; endTime: string; lunchBreakMinutes: number; overnight: boolean }) {
    return this.shiftsService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'HR')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.shiftsService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'HR')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shiftsService.remove(id);
  }
}
