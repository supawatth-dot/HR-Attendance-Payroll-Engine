import { Module } from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { CompanySettingsController } from './company-settings.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
