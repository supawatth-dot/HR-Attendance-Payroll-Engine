/**
 * import.service.ts
 *
 * Handles end-to-end processing of uploaded attendance files (CSV / Excel).
 *
 * Pipeline:
 *   1. Create an ImportLog record with status PROCESSING.
 *   2. Detect file type from MIME type / extension.
 *   3. Parse the buffer using CsvParser or ExcelParser.
 *   4. Validate each row (employeeId required, clockIn required).
 *   5. Check for duplicates against existing AttendanceRaw records.
 *   6. Collect per-row errors; mark invalid rows.
 *   7. Bulk-insert valid rows into AttendanceRaw.
 *   8. Update ImportLog with final status and error report JSON.
 *   9. Enqueue a BullMQ job to run the attendance engine.
 *  10. Return ImportBatchResult.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CsvParser, RawAttendanceRow } from './parsers/csv.parser';
import { ExcelParser } from './parsers/excel.parser';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ImportRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ImportBatchResult {
  batchId: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ImportRowError[];
}

// Queue name constant – must match the worker registration
export const ATTENDANCE_ENGINE_QUEUE = 'run-attendance-engine';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParser: CsvParser,
    private readonly excelParser: ExcelParser,
    @InjectQueue(ATTENDANCE_ENGINE_QUEUE)
    private readonly attendanceQueue: Queue,
  ) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Processes an uploaded attendance file.
   *
   * @param file   – multer file object (buffer must be populated)
   * @param userId – ID of the user who triggered the upload (for audit log)
   */
  async processFile(
    file: Express.Multer.File,
    userId: number,
  ): Promise<ImportBatchResult> {
    // ------------------------------------------------------------------
    // 1. Create ImportLog with status PROCESSING
    // ------------------------------------------------------------------
    const importLog = await this.prisma.importLog.create({
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        uploadedById: userId,
        status: 'PROCESSING',
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
      },
    });
    const batchId = importLog.id;

    this.logger.log(
      `ImportLog #${batchId} created for file "${file.originalname}" ` +
        `(${file.size} bytes) by user ${userId}.`,
    );

    try {
      // ------------------------------------------------------------------
      // 2. Detect file type
      // ------------------------------------------------------------------
      const fileType = this.detectFileType(file);

      // ------------------------------------------------------------------
      // 3. Parse
      // ------------------------------------------------------------------
      const rawRows = this.parseFile(file.buffer, fileType);
      this.logger.log(
        `ImportLog #${batchId}: parsed ${rawRows.length} row(s).`,
      );

      // ------------------------------------------------------------------
      // 4 & 5 & 6. Validate + duplicate check + collect errors
      // ------------------------------------------------------------------
      const errors: ImportRowError[] = [];
      const validRows: RawAttendanceRow[] = [];

      for (const row of rawRows) {
        const rowErrors = await this.validateRow(row);
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          continue;
        }

        // Duplicate check
        const isDuplicate = await this.isDuplicate(row);
        if (isDuplicate) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'clockIn',
            message: `Duplicate record: employee ${row.employeeId} already has a clock-in at ${row.clockIn!.toISOString()}.`,
          });
          continue;
        }

        validRows.push(row);
      }

      // ------------------------------------------------------------------
      // 7. Bulk insert valid rows into AttendanceRaw
      // ------------------------------------------------------------------
      if (validRows.length > 0) {
        await this.prisma.attendanceRaw.createMany({
          data: validRows.map((row) => ({
            employeeId: parseInt(row.employeeId, 10),
            clockIn: row.clockIn!,
            clockOut: row.clockOut ?? null,
            date: row.date!,
            importLogId: batchId,
          })),
          skipDuplicates: true,
        });
        this.logger.log(
          `ImportLog #${batchId}: inserted ${validRows.length} raw attendance row(s).`,
        );
      }

      // ------------------------------------------------------------------
      // 8. Update ImportLog with final status
      // ------------------------------------------------------------------
      const finalStatus = errors.length === 0 ? 'COMPLETED' : 'COMPLETED_WITH_ERRORS';
      await this.prisma.importLog.update({
        where: { id: batchId },
        data: {
          status: finalStatus,
          totalRows: rawRows.length,
          validRows: validRows.length,
          errorRows: errors.length,
          errorReport: errors.length > 0 ? (errors as object[]) : undefined,
          processedAt: new Date(),
        },
      });

      // ------------------------------------------------------------------
      // 9. Enqueue BullMQ job to run the attendance engine
      //    The job payload includes the date range spanned by the import.
      // ------------------------------------------------------------------
      if (validRows.length > 0) {
        const dates = validRows
          .map((r) => r.date!.getTime())
          .filter(Boolean);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        await this.attendanceQueue.add(
          'run-attendance-engine',
          {
            importLogId: batchId,
            startDate: minDate.toISOString(),
            endDate: maxDate.toISOString(),
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
          },
        );

        this.logger.log(
          `ImportLog #${batchId}: enqueued attendance engine job for ` +
            `${minDate.toISOString().slice(0, 10)} → ${maxDate.toISOString().slice(0, 10)}.`,
        );
      }

      // ------------------------------------------------------------------
      // 10. Return result
      // ------------------------------------------------------------------
      return {
        batchId,
        totalRows: rawRows.length,
        validRows: validRows.length,
        errorRows: errors.length,
        errors,
      };
    } catch (err: unknown) {
      // Mark import as FAILED and re-throw
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.importLog.update({
        where: { id: batchId },
        data: {
          status: 'FAILED',
          errorReport: [{ message }],
          processedAt: new Date(),
        },
      });
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Determines the file type from MIME type or file extension. */
  private detectFileType(file: Express.Multer.File): 'csv' | 'excel' {
    const mime = file.mimetype.toLowerCase();
    const name = file.originalname.toLowerCase();

    if (
      mime === 'text/csv' ||
      mime === 'application/csv' ||
      name.endsWith('.csv')
    ) {
      return 'csv';
    }

    if (
      mime ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === 'application/vnd.ms-excel' ||
      name.endsWith('.xlsx') ||
      name.endsWith('.xls')
    ) {
      return 'excel';
    }

    throw new UnsupportedMediaTypeException(
      `Unsupported file type: "${file.mimetype}". Only CSV and Excel files are accepted.`,
    );
  }

  /** Parses the buffer using the appropriate parser. */
  private parseFile(
    buffer: Buffer,
    fileType: 'csv' | 'excel',
  ): RawAttendanceRow[] {
    if (fileType === 'csv') {
      return this.csvParser.parse(buffer);
    }
    return this.excelParser.parse(buffer);
  }

  /**
   * Validates a single parsed row.
   * Returns an array of ImportRowError (empty = valid).
   */
  private async validateRow(row: RawAttendanceRow): Promise<ImportRowError[]> {
    const errors: ImportRowError[] = [];

    // employeeId: required and must be a positive integer
    if (!row.employeeId || row.employeeId.trim() === '') {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'employee_id',
        message: 'employee_id is required.',
      });
    } else {
      const numId = parseInt(row.employeeId, 10);
      if (isNaN(numId) || numId <= 0) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'employee_id',
          message: `employee_id "${row.employeeId}" is not a valid positive integer.`,
        });
      } else {
        // Verify employee exists
        const exists = await this.prisma.employee.count({
          where: { id: numId, isActive: true },
        });
        if (exists === 0) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'employee_id',
            message: `No active employee found with ID ${numId}.`,
          });
        }
      }
    }

    // clockIn: required and must be a valid date
    if (!row.clockIn) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'clock_in',
        message: 'clock_in is required and must be a valid date-time.',
      });
    }

    // date: must be derivable
    if (!row.date) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'date',
        message:
          'date could not be determined (provide an explicit date or a valid clock_in).',
      });
    }

    return errors;
  }

  /**
   * Checks whether an AttendanceRaw record already exists for the given
   * employee on the same clock-in timestamp.
   */
  private async isDuplicate(row: RawAttendanceRow): Promise<boolean> {
    if (!row.clockIn) return false;

    const count = await this.prisma.attendanceRaw.count({
      where: {
        employeeId: parseInt(row.employeeId, 10),
        clockIn: row.clockIn,
      },
    });

    return count > 0;
  }
}
