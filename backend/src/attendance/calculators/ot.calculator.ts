/**
 * ot.calculator.ts
 *
 * Calculates overtime pay for a single day.
 *
 * Rules loaded from the rule engine (category: OT):
 *   ot_rate_multiplier         – multiplier applied on normal working days
 *   weekend_ot_rate_multiplier – multiplier applied on weekends / public holidays
 *
 * Formula:
 *   hourlyRate = dailyRate / 8
 *   otPay      = hourlyRate × (otSeconds / 3600) × multiplier
 *
 * NOTHING is hard-coded in this class.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IRuleEngineService } from '../../rules/rule-engine.service';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface OtPayResult {
  /** Gross overtime pay amount */
  otPay: number;

  /** Multiplier that was applied */
  multiplierUsed: number;

  /** Hourly rate derived from dailyRate */
  hourlyRate: number;
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

@Injectable()
export class OtCalculator {
  private readonly logger = new Logger(OtCalculator.name);

  constructor(private readonly ruleEngine: IRuleEngineService) {}

  /**
   * Computes the overtime pay for a given number of OT seconds.
   *
   * @param otSeconds   - Seconds of overtime (from WorkingHoursCalculator.otSeconds)
   * @param dailyRate   - The employee's gross daily wage
   * @param date        - The calendar date (used for rule version lookup)
   * @param isWeekend   - True when the day is a weekend or public holiday
   * @param departmentId - Optional; used for department-scoped rule overrides
   */
  async calculateOtPay(
    otSeconds: number,
    dailyRate: number,
    date: Date,
    isWeekend: boolean,
    departmentId?: number,
  ): Promise<OtPayResult> {
    if (otSeconds <= 0) {
      return { otPay: 0, multiplierUsed: 0, hourlyRate: dailyRate / 8 };
    }

    // ------------------------------------------------------------------
    // Load the appropriate OT rate multiplier from the rule engine
    // ------------------------------------------------------------------
    const ruleKey = isWeekend
      ? 'weekend_ot_rate_multiplier'
      : 'ot_rate_multiplier';

    const multiplier = await this.ruleEngine.getRuleValueAsNumber(
      'OT',
      ruleKey,
      date,
      departmentId,
    );

    this.logger.debug(
      `OT rules: key=${ruleKey}, multiplier=${multiplier}, ` +
        `otSeconds=${otSeconds}, dailyRate=${dailyRate}`,
    );

    // ------------------------------------------------------------------
    // Compute hourly rate
    //   dailyRate / 8 assumes an 8-hour standard workday.
    //   If your standard hours differ, surface that as a rule as well.
    // ------------------------------------------------------------------
    const hourlyRate = dailyRate / 8;

    // ------------------------------------------------------------------
    // OT pay formula
    // ------------------------------------------------------------------
    const otHours = otSeconds / 3_600;
    const otPay = hourlyRate * otHours * multiplier;

    this.logger.debug(
      `OT result: hourlyRate=${hourlyRate}, otHours=${otHours.toFixed(4)}, otPay=${otPay}`,
    );

    return { otPay, multiplierUsed: multiplier, hourlyRate };
  }
}
