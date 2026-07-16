import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('company-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanySettingsController {
  constructor(private readonly service: CompanySettingsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.service.findOne(key);
  }

  @Put(':key')
  @Roles('ADMIN')
  set(@Param('key') key: string, @Body() body: { value: string }, @Request() req: any) {
    return this.service.set(key, body.value, req.user?.userId || 1);
  }
}
