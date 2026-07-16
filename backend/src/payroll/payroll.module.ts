import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollExportService } from './payroll-export.service';
import { PayrollController } from './payroll.controller';
import { DiligenceCalculator } from '../attendance/calculators/diligence.calculator';
import { OtCalculator } from '../attendance/calculators/ot.calculator';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, PayrollExportService, DiligenceCalculator, OtCalculator],
  exports: [PayrollService, PayrollExportService],
})
export class PayrollModule {}
