/**
 * attendance.service.ts
 *
 * Public facade for the attendance domain.
 *
 * Responsibilities:
 *   - Delegates date-range processing to AttendanceEngineService.
 *   - Exposes a rich query API for AttendanceResult records.
 *
 * Controllers and other modules MUST interact with the attendance domain
 * exclusively through this facade – they should never call the engine or
 * calculators directly.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceEngineService } from './attendance-engine.service';

// ---------------------------------------------------------------------------
// Query filter / result types
// ---------------------------------------------------------------------------

export interface AttendanceResultFilters {
  /** Filter by one or more employee IDs */
  employeeIds?: number[];

  /** Inclusive start of the date window */
  dateFrom?: Date;

  /** Inclusive end of the date window */
  dateTo?: Date;

  /** Filter to only records with a missing clock */
  missingClock?: boolean;

  /** Filter to only absent records */
  isAbsent?: boolean;

  /** Pagination – page number (1-based) */
  page?: number;

  /** Pagination – records per page */
  pageSize?: number;
}

export interface AttendanceResultPage {
  data: AttendanceResultRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Typed shape of a single AttendanceResult row returned to callers. */
export interface AttendanceResultRecord {
  id: number;
  employeeId: number;
  date: Date;
  missingClock: boolean;
  isAbsent: boolean;
  workingSeconds: number;
  lateSeconds: number;
  earlyOutSeconds: number;
  otSeconds: number;
  mealAllowance: number;
  createdAt: Date;
  updatedAt: Date;
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
}

// ---------------------------------------------------------------------------
// Facade Service
// ---------------------------------------------------------------------------

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AttendanceEngineService,
  ) {}

  // -------------------------------------------------------------------------
  // Command: trigger engine run
  // -------------------------------------------------------------------------

  /**
   * Runs the full attendance calculation pipeline for the given date range.
   * Delegates entirely to AttendanceEngineService (no business logic here).
   */
  async runForDateRange(startDate: Date, endDate: Date): Promise<void> {
    this.logger.log(
      `AttendanceService.runForDateRange: ${startDate.toISOString()} → ${endDate.toISOString()}`,
    );
    await this.engine.runForDateRange(startDate, endDate);
  }

  // -------------------------------------------------------------------------
  // Query: fetch results
  // -------------------------------------------------------------------------

  /**
   * Returns a paginated list of AttendanceResult records matching the given
   * filters. Always includes the related Employee record.
   */
  async getResults(
    filters: AttendanceResultFilters = {},
  ): Promise<AttendanceResultPage> {
    const {
      employeeIds,
      dateFrom,
      dateTo,
      missingClock,
      isAbsent,
      page = 1,
      pageSize = 50,
    } = filters;

    // Build Prisma where clause
    const where: Record<string, unknown> = {};

    if (employeeIds && employeeIds.length > 0) {
      where['employeeId'] = { in: employeeIds };
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter['gte'] = dateFrom;
      if (dateTo) dateFilter['lte'] = dateTo;
      where['date'] = dateFilter;
    }

    if (missingClock !== undefined) {
      where['missingClock'] = missingClock;
    }

    if (isAbsent !== undefined) {
      where['isAbsent'] = isAbsent;
    }

    // Pagination
    const skip = (page - 1) * pageSize;

    // Execute count + data query in parallel
    const [total, rows] = await Promise.all([
      this.prisma.attendanceResult.count({ where }),
      this.prisma.attendanceResult.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
        },
      }),
    ]);

    this.logger.debug(
      `getResults: ${rows.length} rows returned (total=${total}, page=${page}).`,
    );

    return {
      data: rows as unknown as AttendanceResultRecord[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // -------------------------------------------------------------------------
  // Query: single record
  // -------------------------------------------------------------------------

  /**
   * Returns a single AttendanceResult for a specific employee on a specific
   * date, including the related RuleVersion snapshot used for the calculation.
   * Returns null if no record exists.
   */
  async getResultForEmployee(
    employeeId: number,
    date: Date,
  ): Promise<AttendanceResultRecord | null> {
    const result = await this.prisma.attendanceResult.findUnique({
      where: { employeeId_date: { employeeId, date } },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });

    return result as unknown as AttendanceResultRecord | null;
  }

  // -------------------------------------------------------------------------
  // Aggregates
  // -------------------------------------------------------------------------

  /**
   * Returns aggregated totals for an employee over a date range.
   * Useful for payroll summary screens.
   */
  async getSummaryForEmployee(
    employeeId: number,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalWorkingSeconds: number;
    totalLateSeconds: number;
    totalOtSeconds: number;
    totalMealAllowance: number;
    absentDays: number;
    missingClockDays: number;
  }> {
    const rows = await this.prisma.attendanceResult.findMany({
      where: {
        employeeId,
        date: { gte: dateFrom, lte: dateTo },
      },
      select: {
        workingSeconds: true,
        lateSeconds: true,
        otSeconds: true,
        mealAllowance: true,
        isAbsent: true,
        missingClock: true,
      },
    });

    return rows.reduce(
      (acc, row) => {
        acc.totalWorkingSeconds += row.workingSeconds;
        acc.totalLateSeconds += row.lateSeconds;
        acc.totalOtSeconds += row.otSeconds;
        acc.totalMealAllowance += row.mealAllowance;
        if (row.isAbsent) acc.absentDays += 1;
        if (row.missingClock) acc.missingClockDays += 1;
        return acc;
      },
      {
        totalWorkingSeconds: 0,
        totalLateSeconds: 0,
        totalOtSeconds: 0,
        totalMealAllowance: 0,
        absentDays: 0,
        missingClockDays: 0,
      },
    );
  }
}
