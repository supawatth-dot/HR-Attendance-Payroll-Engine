import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { RulesService } from './rules.service';
import { CreateRuleVersionDto } from './dto/create-rule-version.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get('categories')
  getCategories() {
    return this.rulesService.getCategories();
  }

  @Get('definitions')
  getDefinitions(@Query('categoryId') categoryId?: number) {
    return this.rulesService.getDefinitions(categoryId);
  }

  @Get('versions')
  getVersions(@Query('definitionId') definitionId?: number) {
    return this.rulesService.getVersions(definitionId);
  }

  @Post('versions')
  @Roles('ADMIN', 'HR')
  createVersion(@Body() dto: CreateRuleVersionDto, @Request() req: any) {
    return this.rulesService.createVersion(dto, req.user?.userId || 1);
  }

  @Get('versions/:id/values')
  getValues(@Param('id', ParseIntPipe) id: number) {
    return this.rulesService.getValues(id);
  }

  @Put('versions/:id/values')
  @Roles('ADMIN', 'HR')
  upsertValues(@Param('id', ParseIntPipe) id: number, @Body() body: { values: any[] }, @Request() req: any) {
    return this.rulesService.upsertValues(id, body.values, req.user?.userId || 1);
  }
}
