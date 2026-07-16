/**
 * attendance-engine.service.ts
 *
 * Orchestrates the full attendance calculation pipeline for a date range.
 *
 * For each calendar date in [startDate, endDate]:
 *   1. Skip public holidays (checked via HolidaysService).
 *   2. Load all active employees who have a shift assignment.
 *   3. For each employee:
 *      a. Skip if on an approved leave.
 *      b. Fetch AttendanceRaw (clock-in/out) for the date.
 *      c. Run WorkingHoursCalculator.
 *      d. Run MealAllowanceCalculator.
 *      e. Upsert the result into AttendanceResult.
 *
 * This service coordinates other domain services; it contains NO business
 * logic itself (that lives in the individual calculators).
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RuleEngineService } from '../rules/rule-engine.service';
import { HolidaysService } from '../holidays/holidays.service';
import { LeavesService } from '../leaves/leaves.service';
import { WorkingHoursCalculator } from './calculators/working-hours.calculator';
import { MealAllowanceCalculator } from './calculators/meal-allowance.calculator';

// ---------------------------------------------------------------------------
// Minimal interfaces for injected domain services
// (Full types live in their own modules; these keep circular deps at bay.)
// ---------------------------------------------------------------------------

export interface IHolidaysService {
  isHoliday(date: Date): Promise<boolean>;
}

export interface ILeaveService {
  isOnLeave(employeeId: number, date: Date): Promise<boolean>;
}

// Employee with shift assignment shape expected from Prisma
interface EmployeeWithShift {
  id: number;
  departmentId: number | null;
  shift: {
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
  } | null;
}

// AttendanceRaw shape
interface AttendanceRaw {
  clockIn: Date | null;
  clockOut: Date | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AttendanceEngineService {
  private readonly logger = new Logger(AttendanceEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEngine: RuleEngineService,
    private readonly workingHoursCalc: WorkingHoursCalculator,
    private readonly mealAllowanceCalc: MealAllowanceCalculator,
    @Inject(HolidaysService) private readonly holidaysService: IHolidaysService,
    @Inject(LeavesService) private readonly leaveService: ILeaveService,
  ) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Runs the attendance engine for every date in [startDate, endDate]
   * (inclusive, iterating day by day).
   */
  async runForDateRange(startDate: Date, endDate: Date): Promise<void> {
    this.logger.log(
      `AttendanceEngine: running for ${startDate.toISOString()} → ${endDate.toISOString()}`,
    );

    const dates = this.enumerateDates(startDate, endDate);
    this.logger.log(`Processing ${dates.length} calendar day(s).`);

    for (const date of dates) {
      await this.processDate(date);
    }

    this.logger.log('AttendanceEngine: date range complete.');
  }

  // -------------------------------------------------------------------------
  // Per-date orchestration
  // -------------------------------------------------------------------------

  private async processDate(date: Date): Promise<void> {
    const dateLabel = date.toISOString().slice(0, 10);

    // 1. Skip public holidays
    const isHoliday = await this.holidaysService.isHoliday(date);
    if (isHoliday) {
      this.logger.debug(`[${dateLabel}] Public holiday – skipping.`);
      return;
    }

    // 2. Load active employees with a shift assignment
    const employees = await this.loadActiveEmployeesWithShift();
    this.logger.debug(
      `[${dateLabel}] Processing ${employees.length} employee(s).`,
    );

    // 3. Process each employee (sequential to avoid DB connection exhaustion
    //    on very large employee sets; parallelise in batches if needed)
    for (const employee of employees) {
      await this.processEmployeeForDate(employee, date).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[${dateLabel}] Error processing employee ${employee.id}: ${msg}`,
        );
        // Continue with next employee rather than aborting the entire batch
      });
    }
  }

  private async processEmployeeForDate(
    employee: EmployeeWithShift,
    date: Date,
  ): Promise<void> {
    const { id: employeeId, departmentId, shift } = employee;

    // a. Skip employees on approved leave
    const onLeave = await this.leaveService.isOnLeave(employeeId, date);
    if (onLeave) {
      this.logger.debug(
        `Employee ${employeeId} is on leave – skipping ${date.toISOString().slice(0, 10)}.`,
      );
      return;
    }

    // b. Fetch raw attendance for the date
    const rawAttendance = await this.fetchRawAttendance(employeeId, date);

    // c. Build shift boundary Date objects
    const { shiftStart, shiftEnd } = this.buildShiftBoundaries(date, shift);

    // d. Calculate working hours
    const workingHours = await this.workingHoursCalc.calculate({
      clockIn: rawAttendance?.clockIn ?? null,
      clockOut: rawAttendance?.clockOut ?? null,
      shiftStart,
      shiftEnd,
      date,
      departmentId: departmentId ?? undefined,
    });

    // e. Calculate meal allowance
    const mealAllowance = await this.mealAllowanceCalc.calculate({
      missingClock: workingHours.missingClock,
      workingSeconds: workingHours.workingSeconds,
      lateSeconds: workingHours.lateSeconds,
      date,
      departmentId: departmentId ?? undefined,
    });

    // f. Upsert AttendanceResult
    await this.prisma.attendanceResult.upsert({
      where: {
        // Composite unique key: employeeId + date
        employeeId_date: { employeeId, date },
      },
      create: {
        employeeId,
        date,
        missingClock: workingHours.missingClock,
        isAbsent: workingHours.missingClock,
        workingSeconds: workingHours.workingSeconds,
        lateSeconds: workingHours.lateSeconds,
        earlyOutSeconds: workingHours.earlyOutSeconds,
        otSeconds: workingHours.otSeconds,
        mealAllowance: mealAllowance.amount,
      },
      update: {
        missingClock: workingHours.missingClock,
        isAbsent: workingHours.missingClock,
        workingSeconds: workingHours.workingSeconds,
        lateSeconds: workingHours.lateSeconds,
        earlyOutSeconds: workingHours.earlyOutSeconds,
        otSeconds: workingHours.otSeconds,
        mealAllowance: mealAllowance.amount,
        updatedAt: new Date(),
      },
    });

    this.logger.debug(
      `Employee ${employeeId} on ${date.toISOString().slice(0, 10)}: ` +
        `working=${workingHours.workingSeconds}s, ` +
        `late=${workingHours.lateSeconds}s, ` +
        `meal=${mealAllowance.amount}`,
    );
  }

  // -------------------------------------------------------------------------
  // Data helpers
  // -------------------------------------------------------------------------

  private async loadActiveEmployeesWithShift(): Promise<EmployeeWithShift[]> {
    return this.prisma.employee.findMany({
      where: { isActive: true, shift: { isNot: null } },
      select: {
        id: true,
        departmentId: true,
        shift: { select: { startTime: true, endTime: true } },
      },
    }) as Promise<EmployeeWithShift[]>;
  }

  private async fetchRawAttendance(
    employeeId: number,
    date: Date,
  ): Promise<AttendanceRaw | null> {
    return this.prisma.attendanceRaw.findFirst({
      where: {
        employeeId,
        date: {
          gte: this.startOfDay(date),
          lt: this.endOfDay(date),
        },
      },
      orderBy: { clockIn: 'asc' },
      select: { clockIn: true, clockOut: true },
    });
  }

  /**
   * Converts HH:mm shift strings into full Date objects anchored to the given date.
   */
  private buildShiftBoundaries(
    date: Date,
    shift: EmployeeWithShift['shift'],
  ): { shiftStart: Date; shiftEnd: Date } {
    // Default to midnight (00:00) if no shift is configured
    const defaultTime = '00:00';
    const startStr = shift?.startTime ?? defaultTime;
    const endStr = shift?.endTime ?? defaultTime;

    return {
      shiftStart: this.buildDateFromHHmm(date, startStr),
      shiftEnd: this.buildDateFromHHmm(date, endStr),
    };
  }

  /** Creates a Date for a given date + HH:mm time string (local time). */
  private buildDateFromHHmm(date: Date, hhmm: string): Date {
    const [hStr, mStr] = hhmm.split(':');
    const result = new Date(date);
    result.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
    return result;
  }

  // -------------------------------------------------------------------------
  // Date utilities
  // -------------------------------------------------------------------------

  /** Returns an array of Dates covering every day from start to end, inclusive. */
  private enumerateDates(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    const endNorm = new Date(end);
    endNorm.setHours(23, 59, 59, 999);

    while (cursor <= endNorm) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
