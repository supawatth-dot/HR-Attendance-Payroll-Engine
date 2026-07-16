/**
 * attendance.worker.ts
 *
 * BullMQ worker that processes 'run-attendance-engine' jobs.
 *
 * Job payload shape:
 *   {
 *     importLogId: number;
 *     startDate: string; // ISO-8601
 *     endDate:   string; // ISO-8601
 *   }
 *
 * Steps:
 *  1. Parse the date range from the job payload.
 *  2. Invoke AttendanceEngineService.runForDateRange().
 *  3. On success: update ImportLog status to COMPLETED (if not already).
 *  4. On failure: update ImportLog status to FAILED, surface error.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceEngineService } from '../attendance-engine.service';
import { ATTENDANCE_ENGINE_QUEUE } from '../../import/import.service';

// ---------------------------------------------------------------------------
// Job payload type
// ---------------------------------------------------------------------------

interface AttendanceEngineJobPayload {
  importLogId: number;
  startDate: string;
  endDate: string;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

@Processor(ATTENDANCE_ENGINE_QUEUE)
export class AttendanceWorker extends WorkerHost {
  private readonly logger = new Logger(AttendanceWorker.name);

  constructor(
    private readonly attendanceEngine: AttendanceEngineService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  /**
   * Main job handler.
   * BullMQ calls this method automatically when a job is dequeued.
   * Returning normally = success; throwing = failure (triggers retry logic).
   */
  async process(job: Job<AttendanceEngineJobPayload>): Promise<void> {
    const { importLogId, startDate, endDate } = job.data;

    this.logger.log(
      `[Job #${job.id}] Processing attendance engine job for ` +
        `ImportLog #${importLogId}: ${startDate} → ${endDate}`,
    );

    // ------------------------------------------------------------------
    // Validate payload
    // ------------------------------------------------------------------
    if (!startDate || !endDate) {
      throw new Error(
        `[Job #${job.id}] Invalid payload: startDate and endDate are required.`,
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error(
        `[Job #${job.id}] Invalid payload: startDate "${startDate}" or ` +
          `endDate "${endDate}" could not be parsed as a Date.`,
      );
    }

    if (start > end) {
      throw new Error(
        `[Job #${job.id}] Invalid payload: startDate must be <= endDate.`,
      );
    }

    // ------------------------------------------------------------------
    // Mark ImportLog as ENGINE_RUNNING
    // ------------------------------------------------------------------
    await this.safeUpdateImportLog(importLogId, 'ENGINE_RUNNING');

    try {
      // ------------------------------------------------------------------
      // Run the engine
      // ------------------------------------------------------------------
      await this.attendanceEngine.runForDateRange(start, end);

      this.logger.log(
        `[Job #${job.id}] Attendance engine completed for ImportLog #${importLogId}.`,
      );

      // ------------------------------------------------------------------
      // Update ImportLog → ENGINE_COMPLETED
      // ------------------------------------------------------------------
      await this.safeUpdateImportLog(importLogId, 'ENGINE_COMPLETED');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;

      this.logger.error(
        `[Job #${job.id}] Attendance engine FAILED for ImportLog #${importLogId}: ${message}`,
        stack,
      );

      // ------------------------------------------------------------------
      // Persist failure details in ImportLog
      // ------------------------------------------------------------------
      await this.safeUpdateImportLog(importLogId, 'ENGINE_FAILED', message);

      // Re-throw so BullMQ knows the job failed and can retry per policy
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Updates the ImportLog status field without letting DB errors mask the
   * original job error.
   */
  private async safeUpdateImportLog(
    importLogId: number,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.prisma.importLog.update({
        where: { id: importLogId },
        data: {
          status,
          ...(errorMessage
            ? {
                errorReport: [{ phase: 'engine', message: errorMessage }],
              }
            : {}),
          updatedAt: new Date(),
        },
      });
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      this.logger.warn(
        `Could not update ImportLog #${importLogId} status to "${status}": ${msg}`,
      );
      // Intentionally swallowed – the original job error takes precedence
    }
  }
}
