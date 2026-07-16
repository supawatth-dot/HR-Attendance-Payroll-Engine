import { MealAllowanceCalculator } from './meal-allowance.calculator';
import { IRuleEngineService } from '../../rules/rule-engine.service';

function makeRuleEngine(values: Record<string, number>): IRuleEngineService {
  return {
    getRuleValueAsNumber: jest.fn(
      async (category: string, key: string) => values[`${category}.${key}`],
    ),
  } as unknown as IRuleEngineService;
}

const DATE = new Date(2026, 0, 15);

const RULES = {
  'MEAL_ALLOWANCE.meal_rate': 50,
  'MEAL_ALLOWANCE.min_working_hours': 4, // 14400s
  'MEAL_ALLOWANCE.max_late_minutes': 30, // 1800s
};

describe('MealAllowanceCalculator', () => {
  function calc(rules: Record<string, number> = RULES) {
    return new MealAllowanceCalculator(makeRuleEngine(rules));
  }

  it('pays nothing when the clock record is missing', async () => {
    const result = await calc().calculate({
      missingClock: true,
      workingSeconds: 30000,
      lateSeconds: 0,
      date: DATE,
    });

    expect(result.amount).toBe(0);
    expect(result.reason).toMatch(/missing clock/i);
  });

  it('pays the configured rate for an eligible day', async () => {
    const result = await calc().calculate({
      missingClock: false,
      workingSeconds: 28800, // 8h, above the 4h minimum
      lateSeconds: 0,
      date: DATE,
    });

    expect(result.amount).toBe(50);
    expect(result.reason).toBeUndefined();
  });

  it('pays nothing when working time is below the minimum', async () => {
    const result = await calc().calculate({
      missingClock: false,
      workingSeconds: 14399, // one second short of 4h
      lateSeconds: 0,
      date: DATE,
    });

    expect(result.amount).toBe(0);
    expect(result.reason).toMatch(/minimum required hours/i);
  });

  it('treats exactly the minimum working time as eligible', async () => {
    const result = await calc().calculate({
      missingClock: false,
      workingSeconds: 14400, // exactly 4h
      lateSeconds: 0,
      date: DATE,
    });

    expect(result.amount).toBe(50);
  });

  it('pays nothing when lateness exceeds the maximum', async () => {
    const result = await calc().calculate({
      missingClock: false,
      workingSeconds: 28800,
      lateSeconds: 1860, // 31 min, above the 30 min cap
      date: DATE,
    });

    expect(result.amount).toBe(0);
    expect(result.reason).toMatch(/late/i);
  });

  it('treats exactly the maximum lateness as still eligible', async () => {
    const result = await calc().calculate({
      missingClock: false,
      workingSeconds: 28800,
      lateSeconds: 1800, // exactly 30 min
      date: DATE,
    });

    expect(result.amount).toBe(50);
  });
});
