import { OtCalculator } from './ot.calculator';
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
  'OT.ot_rate_multiplier': 1.5,
  'OT.weekend_ot_rate_multiplier': 3,
};

describe('OtCalculator', () => {
  function calc(rules: Record<string, number> = RULES) {
    return new OtCalculator(makeRuleEngine(rules));
  }

  it('returns zero pay when there is no overtime', async () => {
    const result = await calc().calculateOtPay(0, 800, DATE, false);

    expect(result.otPay).toBe(0);
    expect(result.multiplierUsed).toBe(0);
    expect(result.hourlyRate).toBe(100); // 800 / 8
  });

  it('applies the weekday multiplier for normal-day overtime', async () => {
    // dailyRate 800 → hourly 100. 1h OT (3600s) × 1.5 = 150
    const result = await calc().calculateOtPay(3600, 800, DATE, false);

    expect(result.hourlyRate).toBe(100);
    expect(result.multiplierUsed).toBe(1.5);
    expect(result.otPay).toBe(150);
  });

  it('applies the weekend/holiday multiplier when isWeekend is true', async () => {
    // 1h OT × hourly 100 × 3 = 300
    const result = await calc().calculateOtPay(3600, 800, DATE, true);

    expect(result.multiplierUsed).toBe(3);
    expect(result.otPay).toBe(300);
  });

  it('scales pay proportionally to fractional OT hours', async () => {
    // 30 min OT (1800s) → 0.5h × 100 × 1.5 = 75
    const result = await calc().calculateOtPay(1800, 800, DATE, false);

    expect(result.otPay).toBe(75);
  });

  it('does not consult the rule engine when there is no overtime', async () => {
    const engine = makeRuleEngine(RULES);
    await new OtCalculator(engine).calculateOtPay(0, 800, DATE, false);

    expect(engine.getRuleValueAsNumber).not.toHaveBeenCalled();
  });
});
