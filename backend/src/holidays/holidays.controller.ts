import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  findAll(@Query('year') year?: number) {
    return this.holidaysService.findAll(year ? Number(year) : undefined);
  }

  @Post()
  @Roles('ADMIN', 'HR')
  create(@Body() body: { date: string; description: string; isPublic?: boolean }) {
    return this.holidaysService.create(body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'HR')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.holidaysService.remove(id);
  }
}
