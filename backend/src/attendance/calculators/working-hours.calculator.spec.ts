import { WorkingHoursCalculator } from './working-hours.calculator';
import { IRuleEngineService } from '../../rules/rule-engine.service';

/**
 * Builds a stub rule engine that returns fixed values per (category, key).
 * Keeps tests independent of the database-backed rule engine.
 */
function makeRuleEngine(values: Record<string, number>): IRuleEngineService {
  return {
    getRuleValueAsNumber: jest.fn(
      async (category: string, key: string) => values[`${category}.${key}`],
    ),
  } as unknown as IRuleEngineService;
}

/** Convenience: local-time Date for a fixed calendar day. */
function at(hour: number, minute: number, second = 0): Date {
  return new Date(2026, 0, 15, hour, minute, second);
}

const DATE = new Date(2026, 0, 15);

describe('WorkingHoursCalculator', () => {
  const rules = {
    'ATTENDANCE.lunch_break_minutes': 60,
    'ATTENDANCE.ot_threshold_hours': 8,
  };

  function calc() {
    return new WorkingHoursCalculator(makeRuleEngine(rules));
  }

  it('returns a zero result with missingClock when clock-in is absent', async () => {
    const result = await calc().calculate({
      clockIn: null,
      clockOut: at(17, 0),
      shiftStart: at(9, 0),
      shiftEnd: at(17, 0),
      date: DATE,
    });

    expect(result).toEqual({
      missingClock: true,
      workingSeconds: 0,
      lateSeconds: 0,
      earlyOutSeconds: 0,
      otSeconds: 0,
    });
  });

  it('returns a zero result with missingClock when clock-out is absent', async () => {
    const result = await calc().calculate({
      clockIn: at(9, 0),
      clockOut: null,
      shiftStart: at(9, 0),
      shiftEnd: at(17, 0),
      date: DATE,
    });

    expect(result.missingClock).toBe(true);
    expect(result.workingSeconds).toBe(0);
  });

  it('deducts the unpaid lunch break from the raw span', async () => {
    // 09:00 → 17:00 = 8h span, minus 60min lunch = 7h = 25200s
    const result = await calc().calculate({
      clockIn: at(9, 0),
      clockOut: at(17, 0),
      shiftStart: at(9, 0),
      shiftEnd: at(17, 0),
      date: DATE,
    });

    expect(result.missingClock).toBe(false);
    expect(result.workingSeconds).toBe(25200);
    expect(result.lateSeconds).toBe(0);
    expect(result.earlyOutSeconds).toBe(0);
    expect(result.otSeconds).toBe(0);
  });

  it('truncates lateness to whole minutes', async () => {
    // Clocked in at 09:05:40 for a 09:00 shift → 5m40s late, truncated to 5m
    const result = await calc().calculate({
      clockIn: at(9, 5, 40),
      clockOut: at(17, 0),
      shiftStart: at(9, 0),
      shiftEnd: at(17, 0),
      date: DATE,
    });

    expect(result.lateSeconds).toBe(300);
  });

  it('computes early-out seconds when leaving before shift end', async () => {
    // Left at 16:30 for a 17:00 shift end → 30 min early
    const result = await calc().calculate({
      clockIn: at(9, 0),
      clockOut: at(16, 30),
      shiftStart: at(9, 0),
      shiftEnd: at(17, 0),
      date: DATE,
    });

    expect(result.earlyOutSeconds).toBe(1800);
  });

  it('counts working time beyond the OT threshold as overtime', async () => {
    // 09:00 → 19:00 = 10h span, minus 1h lunch = 9h working.
    // OT threshold 8h → 1h (3600s) OT.
    const result = await calc().calculate({
      clockIn: at(9, 0),
      clockOut: at(19, 0),
      shiftStart: at(9, 0),
      shiftEnd: at(17, 0),
      date: DATE,
    });

    expect(result.workingSeconds).toBe(32400);
    expect(result.otSeconds).toBe(3600);
  });

  it('handles overnight shifts by adding 24h to clock-out', async () => {
    const engine = makeRuleEngine({
      'ATTENDANCE.lunch_break_minutes': 0,
      'ATTENDANCE.ot_threshold_hours': 8,
    });
    // Clock in 22:00, clock out 06:00 (same calendar day, earlier time).
    // Overnight handling → 8h span, no lunch → 28800s working.
    const result = await new WorkingHoursCalculator(engine).calculate({
      clockIn: at(22, 0),
      clockOut: at(6, 0),
      shiftStart: at(22, 0),
      shiftEnd: at(6, 0),
      date: DATE,
    });

    expect(result.workingSeconds).toBe(28800);
  });

  it('never returns negative working seconds when lunch exceeds the span', async () => {
    const engine = makeRuleEngine({
      'ATTENDANCE.lunch_break_minutes': 120,
      'ATTENDANCE.ot_threshold_hours': 8,
    });
    // 30-minute span but a 2h lunch rule → clamped to 0, not negative.
    const result = await new WorkingHoursCalculator(engine).calculate({
      clockIn: at(9, 0),
      clockOut: at(9, 30),
      shiftStart: at(9, 0),
      shiftEnd: at(17, 0),
      date: DATE,
    });

    expect(result.workingSeconds).toBe(0);
  });
});
