/**
 * meal-allowance.calculator.ts
 *
 * Determines whether an employee is entitled to a meal allowance for a given
 * attendance record, and returns the applicable rate.
 *
 * Business rules are entirely sourced from the rule engine:
 *   MEAL_ALLOWANCE / meal_rate              – THB amount per eligible day
 *   MEAL_ALLOWANCE / min_working_hours      – minimum hours required
 *   MEAL_ALLOWANCE / max_late_minutes       – maximum tolerated lateness
 *
 * NOTHING is hard-coded in this class.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IRuleEngineService } from '../../rules/rule-engine.service';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface MealAllowanceInput {
  /** Whether the clock-in or clock-out record is absent */
  missingClock: boolean;

  /** Net working seconds for the day (from WorkingHoursCalculator) */
  workingSeconds: number;

  /** Seconds the employee was late (from WorkingHoursCalculator) */
  lateSeconds: number;

  /** Calendar date of the attendance record – used for rule lookup */
  date: Date;

  /** Optional department for department-scoped rule overrides */
  departmentId?: number;
}

export interface MealAllowanceResult {
  /** Monetary amount of the meal allowance (0 when not eligible) */
  amount: number;

  /** Human-readable reason when amount is 0 */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

@Injectable()
export class MealAllowanceCalculator {
  private readonly logger = new Logger(MealAllowanceCalculator.name);

  constructor(private readonly ruleEngine: IRuleEngineService) {}

  /**
   * Computes the meal allowance for a single attendance record.
   *
   * Eligibility is denied when any of the following is true:
   *   • missingClock is true
   *   • workingSeconds < (min_working_hours × 3600)
   *   • lateSeconds   > (max_late_minutes × 60)
   *
   * When eligible, the employee receives `meal_rate` (from the rule engine).
   */
  async calculate(params: MealAllowanceInput): Promise<MealAllowanceResult> {
    const { missingClock, workingSeconds, lateSeconds, date, departmentId } =
      params;

    // ------------------------------------------------------------------
    // Guard: absent or missing clock → no allowance
    // ------------------------------------------------------------------
    if (missingClock) {
      this.logger.debug('MealAllowance: ineligible – missing clock record.');
      return { amount: 0, reason: 'Missing clock-in or clock-out' };
    }

    // ------------------------------------------------------------------
    // Load rules (all values come from the rule engine)
    // ------------------------------------------------------------------
    const [mealRate, minWorkingHours, maxLateMinutes] = await Promise.all([
      this.ruleEngine.getRuleValueAsNumber(
        'MEAL_ALLOWANCE',
        'meal_rate',
        date,
        departmentId,
      ),
      this.ruleEngine.getRuleValueAsNumber(
        'MEAL_ALLOWANCE',
        'min_working_hours',
        date,
        departmentId,
      ),
      this.ruleEngine.getRuleValueAsNumber(
        'MEAL_ALLOWANCE',
        'max_late_minutes',
        date,
        departmentId,
      ),
    ]);

    this.logger.debug(
      `MealAllowance rules: rate=${mealRate}, minHours=${minWorkingHours}h, maxLate=${maxLateMinutes}min`,
    );

    // ------------------------------------------------------------------
    // Check: did the employee work enough hours?
    // ------------------------------------------------------------------
    const minWorkingSeconds = minWorkingHours * 3_600;
    if (workingSeconds < minWorkingSeconds) {
      this.logger.debug(
        `MealAllowance: ineligible – worked ${workingSeconds}s < required ${minWorkingSeconds}s.`,
      );
      return {
        amount: 0,
        reason: `Worked less than the minimum required hours (${minWorkingHours}h)`,
      };
    }

    // ------------------------------------------------------------------
    // Check: was the employee too late?
    // ------------------------------------------------------------------
    const maxLateSeconds = maxLateMinutes * 60;
    if (lateSeconds > maxLateSeconds) {
      this.logger.debug(
        `MealAllowance: ineligible – late ${lateSeconds}s > max ${maxLateSeconds}s.`,
      );
      return {
        amount: 0,
        reason: `Late by more than the maximum allowed (${maxLateMinutes} minutes)`,
      };
    }

    // ------------------------------------------------------------------
    // Employee is eligible – return the configured meal rate
    // ------------------------------------------------------------------
    this.logger.debug(`MealAllowance: eligible – amount=${mealRate}`);
    return { amount: mealRate };
  }
}
