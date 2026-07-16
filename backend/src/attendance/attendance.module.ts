import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceEngineService } from './attendance-engine.service';
import { AttendanceController } from './attendance.controller';
import { WorkingHoursCalculator } from './calculators/working-hours.calculator';
import { MealAllowanceCalculator } from './calculators/meal-allowance.calculator';
import { DiligenceCalculator } from './calculators/diligence.calculator';
import { OtCalculator } from './calculators/ot.calculator';
import { AttendanceWorker } from './workers/attendance.worker';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'attendance-engine-queue',
    }),
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceEngineService,
    WorkingHoursCalculator,
    MealAllowanceCalculator,
    DiligenceCalculator,
    OtCalculator,
    AttendanceWorker,
  ],
  exports: [AttendanceService, AttendanceEngineService],
})
export class AttendanceModule {}
