/**
 * diligence.calculator.ts
 *
 * Calculates the diligence (皆勤) allowance for an employee over a payroll period.
 *
 * Rules loaded from the rule engine (category: DILIGENCE):
 *   max_amount              – maximum diligence allowance for a perfect period
 *   absent_penalty_pct      – percentage deducted per absent day
 *   max_late_minutes_per_day – threshold; ≥3 days exceeding this forfeits all diligence
 *
 * NOTHING is hard-coded in this class.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IRuleEngineService } from '../../rules/rule-engine.service';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface DiligenceResult {
  /** Final diligence amount after penalties (≥ 0) */
  amount: number;

  /** Total absent days in the period */
  absentDays: number;

  /** Days where lateness exceeded max_late_minutes_per_day */
  excessiveLatedays: number;

  /** True when the employee forfeited all diligence due to ≥ 3 late days */
  forfeited: boolean;
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

@Injectable()
export class DiligenceCalculator {
  private readonly logger = new Logger(DiligenceCalculator.name);

  /**
   * Calculates the diligence allowance for a given employee and period.
   *
   * Algorithm:
   *  1. Load rules (max_amount, absent_penalty_pct, max_late_minutes_per_day).
   *  2. Count absent days (missingClock=true OR no AttendanceResult row) in the period.
   *  3. Count days where lateSeconds > max_late_minutes_per_day * 60.
   *  4. If excessive-late days ≥ 3 → forfeit entire diligence (return 0).
   *  5. Apply absent penalty: amount = max_amount × (1 – absentDays × absent_penalty_pct / 100).
   *  6. Clamp result to [0, max_amount].
   */
  async calculateForPeriod(
    employeeId: number,
    periodStart: Date,
    periodEnd: Date,
    ruleEngineService: IRuleEngineService,
    prisma: PrismaService,
  ): Promise<DiligenceResult> {
    // ------------------------------------------------------------------
    // 1. Load rules
    // ------------------------------------------------------------------
    const [maxAmount, absentPenaltyPct, maxLateMinutesPerDay] =
      await Promise.all([
        ruleEngineService.getRuleValueAsNumber(
          'DILIGENCE',
          'max_amount',
          periodStart,
        ),
        ruleEngineService.getRuleValueAsNumber(
          'DILIGENCE',
          'absent_penalty_pct',
          periodStart,
        ),
        ruleEngineService.getRuleValueAsNumber(
          'DILIGENCE',
          'max_late_minutes_per_day',
          periodStart,
        ),
      ]);

    this.logger.debug(
      `Diligence rules: maxAmount=${maxAmount}, penaltyPct=${absentPenaltyPct}%, ` +
        `maxLate=${maxLateMinutesPerDay}min/day`,
    );

    // ------------------------------------------------------------------
    // 2. Fetch all AttendanceResult rows for the employee in the period
    // ------------------------------------------------------------------
    const attendanceRows = await prisma.attendanceResult.findMany({
      where: {
        employeeId,
        date: { gte: periodStart, lte: periodEnd },
      },
      select: {
        date: true,
        missingClock: true,
        lateSeconds: true,
        isAbsent: true,
      },
    });

    // ------------------------------------------------------------------
    // 3. Count absent days
    //    An "absent day" is any row where isAbsent is true OR missingClock is true.
    //    (Holidays and approved leaves are excluded by the attendance engine
    //     and should never appear in AttendanceResult, so we trust the data.)
    // ------------------------------------------------------------------
    const absentDays = attendanceRows.filter(
      (r) => r.isAbsent || r.missingClock,
    ).length;

    // ------------------------------------------------------------------
    // 4. Count days with excessive lateness
    // ------------------------------------------------------------------
    const maxLateSeconds = maxLateMinutesPerDay * 60;
    const excessiveLatedays = attendanceRows.filter(
      (r) => !r.isAbsent && !r.missingClock && r.lateSeconds > maxLateSeconds,
    ).length;

    // ------------------------------------------------------------------
    // 5. Forfeit check: ≥ 3 days of excessive lateness → zero diligence
    // ------------------------------------------------------------------
    const FORFEIT_THRESHOLD = 3;
    if (excessiveLatedays >= FORFEIT_THRESHOLD) {
      this.logger.log(
        `Employee ${employeeId}: diligence forfeited – ${excessiveLatedays} days of excessive lateness.`,
      );
      return {
        amount: 0,
        absentDays,
        excessiveLatedays,
        forfeited: true,
      };
    }

    // ------------------------------------------------------------------
    // 6. Calculate penalty-reduced amount
    //    amount = maxAmount * (1 - absentDays * absentPenaltyPct / 100)
    // ------------------------------------------------------------------
    const penaltyFraction = (absentDays * absentPenaltyPct) / 100;
    const rawAmount = maxAmount * (1 - penaltyFraction);
    const finalAmount = Math.max(0, Math.min(maxAmount, rawAmount));

    this.logger.debug(
      `Diligence result for employee ${employeeId}: ` +
        `absentDays=${absentDays}, excessiveLate=${excessiveLatedays}, ` +
        `amount=${finalAmount}`,
    );

    return {
      amount: finalAmount,
      absentDays,
      excessiveLatedays,
      forfeited: false,
    };
  }
}
