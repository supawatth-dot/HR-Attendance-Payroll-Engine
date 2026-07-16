import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { CsvParser } from './parsers/csv.parser';
import { ExcelParser } from './parsers/excel.parser';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'run-attendance-engine',
    }),
  ],
  controllers: [ImportController],
  providers: [ImportService, CsvParser, ExcelParser],
  exports: [ImportService],
})
export class ImportModule {}
