/**
 * dashboard.service.ts
 *
 * Read-only aggregation layer that powers the Overview dashboard.
 *
 * It reads directly from the persisted AttendanceResult / MealAllowanceResult
 * records (produced by the attendance engine) and rolls them up into the KPIs,
 * per-department breakdown, and daily trend the portal Overview screen shows.
 *
 * All figures come from the database — nothing is hard-coded.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OverviewKpis {
  employees: number;
  leaveDays: number;
  lateCount: number;
  workingHours: number;
  otHours: number;
  mealTotal: number;
  absentDays: number;
}

export interface DepartmentBreakdown {
  department: string;
  employees: number;
  workingHours: number;
  otHours: number;
  lateCount: number;
  mealTotal: number;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  lateCount: number;
  otHours: number;
}

export interface OverviewResponse {
  range: { startDate: string; endDate: string };
  kpis: OverviewKpis;
  byDepartment: DepartmentBreakdown[];
  trend: TrendPoint[];
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Rounds to one decimal place. */
  private round1(n: number): number {
    return Math.round(n * 10) / 10;
  }

  private toDateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  async getOverview(startDate: Date, endDate: Date): Promise<OverviewResponse> {
    this.logger.log(
      `getOverview: ${this.toDateKey(startDate)} → ${this.toDateKey(endDate)}`,
    );

    // Active employees = those without a termination date.
    const employees = await this.prisma.employee.count({
      where: { terminationDate: null },
    });

    // Leaves overlapping the window.
    const leaveDays = await this.prisma.leave.count({
      where: {
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    // All attendance results in the window, with department + meal allowance.
    const results = await this.prisma.attendanceResult.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: {
        date: true,
        workingSeconds: true,
        lateSeconds: true,
        otSeconds: true,
        isAbsent: true,
        mealAllowance: true,
        employee: {
          select: {
            id: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    const kpis: OverviewKpis = {
      employees,
      leaveDays,
      lateCount: 0,
      workingHours: 0,
      otHours: 0,
      mealTotal: 0,
      absentDays: 0,
    };

    const deptMap = new Map<
      string,
      { empIds: Set<number>; workingSeconds: number; otSeconds: number; lateCount: number; mealTotal: number }
    >();
    const trendMap = new Map<string, { lateSeconds: number; lateCount: number; otSeconds: number }>();

    for (const r of results) {
      const meal = Number(r.mealAllowance ?? 0);
      const isLate = r.lateSeconds > 0;

      kpis.workingHours += r.workingSeconds;
      kpis.otHours += r.otSeconds;
      kpis.mealTotal += meal;
      if (isLate) kpis.lateCount += 1;
      if (r.isAbsent) kpis.absentDays += 1;

      const deptName = r.employee.department?.name ?? 'Unassigned';
      let dept = deptMap.get(deptName);
      if (!dept) {
        dept = { empIds: new Set(), workingSeconds: 0, otSeconds: 0, lateCount: 0, mealTotal: 0 };
        deptMap.set(deptName, dept);
      }
      dept.empIds.add(r.employee.id);
      dept.workingSeconds += r.workingSeconds;
      dept.otSeconds += r.otSeconds;
      dept.mealTotal += meal;
      if (isLate) dept.lateCount += 1;

      const key = this.toDateKey(r.date);
      let t = trendMap.get(key);
      if (!t) {
        t = { lateSeconds: 0, lateCount: 0, otSeconds: 0 };
        trendMap.set(key, t);
      }
      if (isLate) t.lateCount += 1;
      t.otSeconds += r.otSeconds;
    }

    // Convert seconds → hours for KPI output.
    kpis.workingHours = this.round1(kpis.workingHours / 3600);
    kpis.otHours = this.round1(kpis.otHours / 3600);
    kpis.mealTotal = Math.round(kpis.mealTotal);

    const byDepartment: DepartmentBreakdown[] = Array.from(deptMap.entries())
      .map(([department, d]) => ({
        department,
        employees: d.empIds.size,
        workingHours: this.round1(d.workingSeconds / 3600),
        otHours: this.round1(d.otSeconds / 3600),
        lateCount: d.lateCount,
        mealTotal: Math.round(d.mealTotal),
      }))
      .sort((a, b) => b.otHours - a.otHours);

    const trend: TrendPoint[] = Array.from(trendMap.entries())
      .map(([date, t]) => ({
        date,
        lateCount: t.lateCount,
        otHours: this.round1(t.otSeconds / 3600),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      range: { startDate: this.toDateKey(startDate), endDate: this.toDateKey(endDate) },
      kpis,
      byDepartment,
      trend,
    };
  }
}
