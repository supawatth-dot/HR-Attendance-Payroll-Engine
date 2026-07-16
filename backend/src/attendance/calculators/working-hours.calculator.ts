/**
 * working-hours.calculator.ts
 *
 * Computes working hours, lateness, early-out, and overtime for a single
 * attendance record.
 *
 * All thresholds (lunch break duration, OT threshold) are loaded from the
 * rule engine at runtime – NOTHING is hard-coded here.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IRuleEngineService } from '../../rules/rule-engine.service';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface WorkingHoursInput {
  /** Nullable – absent / missing clock scenarios */
  clockIn: Date | null;
  clockOut: Date | null;

  /** Shift boundaries as plain Date objects on the same calendar day */
  shiftStart: Date;
  shiftEnd: Date;

  /** Used for rule lookups */
  date: Date;
  departmentId?: number;
}

export interface WorkingHoursResult {
  /** True when either clockIn or clockOut is missing */
  missingClock: boolean;

  /** Raw seconds the employee was at work (after deducting lunch break) */
  workingSeconds: number;

  /** Seconds the employee clocked in after shift start (truncated to minutes) */
  lateSeconds: number;

  /** Seconds the employee clocked out before shift end */
  earlyOutSeconds: number;

  /** Seconds of overtime beyond the configured OT threshold */
  otSeconds: number;
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

@Injectable()
export class WorkingHoursCalculator {
  private readonly logger = new Logger(WorkingHoursCalculator.name);

  constructor(private readonly ruleEngine: IRuleEngineService) {}

  /**
   * Main calculation entry point.
   *
   * Steps:
   *  1. Short-circuit when clock-in or clock-out is missing.
   *  2. Load rule values (lunch break, OT threshold) from the rule engine.
   *  3. Handle overnight shifts by adding 24 h to clockOut when needed.
   *  4. Truncate both timestamps to minute precision.
   *  5. Compute workingSeconds, lateSeconds, earlyOutSeconds, otSeconds.
   */
  async calculate(params: WorkingHoursInput): Promise<WorkingHoursResult> {
    const { clockIn, clockOut, shiftStart, shiftEnd, date, departmentId } =
      params;

    // ------------------------------------------------------------------
    // 1. Missing clock guard
    // ------------------------------------------------------------------
    if (!clockIn || !clockOut) {
      this.logger.debug('Missing clock – returning zero result.');
      return {
        missingClock: true,
        workingSeconds: 0,
        lateSeconds: 0,
        earlyOutSeconds: 0,
        otSeconds: 0,
      };
    }

    // ------------------------------------------------------------------
    // 2. Load rules (no hard-coded values)
    // ------------------------------------------------------------------
    const [lunchBreakMinutes, otThresholdHours] = await Promise.all([
      this.ruleEngine.getRuleValueAsNumber(
        'ATTENDANCE',
        'lunch_break_minutes',
        date,
        departmentId,
      ),
      this.ruleEngine.getRuleValueAsNumber(
        'ATTENDANCE',
        'ot_threshold_hours',
        date,
        departmentId,
      ),
    ]);

    this.logger.debug(
      `Rules loaded: lunchBreak=${lunchBreakMinutes}min, otThreshold=${otThresholdHours}h`,
    );

    // ------------------------------------------------------------------
    // 3. Overnight handling
    //    If clockOut is on or before clockIn (employee crossed midnight),
    //    add exactly 24 h to the clockOut timestamp.
    // ------------------------------------------------------------------
    let clockOutMs = clockOut.getTime();
    const clockInMs = clockIn.getTime();

    if (clockOutMs <= clockInMs) {
      clockOutMs += 24 * 60 * 60 * 1_000;
      this.logger.debug('Overnight shift detected – added 24 h to clockOut.');
    }

    // ------------------------------------------------------------------
    // 4. Truncate timestamps to minute precision
    //    Math.floor(ms / 60000) * 60000  removes the sub-minute component
    // ------------------------------------------------------------------
    const clockInTrunc = this.truncateToMinute(clockInMs);
    const clockOutTrunc = this.truncateToMinute(clockOutMs);
    const shiftStartTrunc = this.truncateToMinute(shiftStart.getTime());
    const shiftEndTrunc = this.truncateToMinute(shiftEnd.getTime());

    // ------------------------------------------------------------------
    // 5. Core calculations
    // ------------------------------------------------------------------

    // Working seconds = span at workplace – unpaid lunch break
    const spanSeconds = (clockOutTrunc - clockInTrunc) / 1_000;
    const lunchBreakSeconds = lunchBreakMinutes * 60;
    const workingSeconds = Math.max(0, spanSeconds - lunchBreakSeconds);

    // Late seconds: how long after shift start did the employee arrive?
    // We truncate the result to minute precision as per spec.
    const lateRawSeconds = Math.max(
      0,
      (clockInTrunc - shiftStartTrunc) / 1_000,
    );
    const lateSeconds = this.truncateSecondsToMinute(lateRawSeconds);

    // Early-out seconds: how long before shift end did the employee leave?
    const earlyOutSeconds = Math.max(
      0,
      (shiftEndTrunc - clockOutTrunc) / 1_000,
    );

    // OT seconds: working time that exceeds the configured OT threshold
    const otThresholdSeconds = otThresholdHours * 3_600;
    const otSeconds = Math.max(0, workingSeconds - otThresholdSeconds);

    this.logger.debug(
      `WorkingHoursResult: working=${workingSeconds}s, late=${lateSeconds}s, ` +
        `earlyOut=${earlyOutSeconds}s, ot=${otSeconds}s`,
    );

    return {
      missingClock: false,
      workingSeconds,
      lateSeconds,
      earlyOutSeconds,
      otSeconds,
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Truncates a Unix-ms timestamp to the start of its minute. */
  private truncateToMinute(ms: number): number {
    return Math.floor(ms / 60_000) * 60_000;
  }

  /**
   * Truncates a raw second count to whole-minute precision.
   * e.g. 125 s → 120 s (2 full minutes).
   */
  private truncateSecondsToMinute(seconds: number): number {
    return Math.floor(seconds / 60) * 60;
  }
}
