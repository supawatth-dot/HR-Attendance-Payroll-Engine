/**
 * payroll.service.ts
 *
 * Generates a PayrollBatch for a given pay period.
 *
 * For each active employee the service:
 *   1. Aggregates working hours and OT seconds from AttendanceResult.
 *   2. Sums meal allowance from AttendanceResult.
 *   3. Calculates diligence allowance via DiligenceCalculator.
 *   4. Calculates OT pay via OtCalculator.
 *   5. Derives gross, deductions, and net pay.
 *   6. Upserts a PayrollItem for the employee in the batch.
 *
 * All monetary rates (base salary, daily rate, etc.) come from the
 * employee record. All multipliers and thresholds come from the rule engine.
 * NOTHING is hard-coded here.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RuleEngineService } from '../rules/rule-engine.service';
import { DiligenceCalculator } from '../attendance/calculators/diligence.calculator';
import { OtCalculator } from '../attendance/calculators/ot.calculator';

// ---------------------------------------------------------------------------
// Result / intermediate types
// ---------------------------------------------------------------------------

export interface PayrollItemSummary {
  employeeId: number;
  employeeCode: string;
  fullName: string;

  totalWorkingSeconds: number;
  totalOtSeconds: number;
  totalMealAllowance: number;
  diligenceAmount: number;
  otPay: number;

  baseSalary: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

export interface PayrollBatchResult {
  batchId: number;
  periodStart: Date;
  periodEnd: Date;
  createdBy: number;
  itemCount: number;
  totalGross: number;
  totalNet: number;
  items: PayrollItemSummary[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEngine: RuleEngineService,
    private readonly diligenceCalc: DiligenceCalculator,
    private readonly otCalc: OtCalculator,
  ) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Generates (or re-generates) a PayrollBatch for the given period.
   *
   * This method is idempotent: running it twice for the same period will
   * upsert the existing PayrollBatch and all PayrollItems.
   */
  async generateBatch(
    periodStart: Date,
    periodEnd: Date,
    createdBy: number,
  ): Promise<PayrollBatchResult> {
    this.logger.log(
      `PayrollService.generateBatch: ${periodStart.toISOString()} → ` +
        `${periodEnd.toISOString()} by user ${createdBy}.`,
    );

    // ------------------------------------------------------------------
    // 1. Create (or re-create) the PayrollBatch header
    // ------------------------------------------------------------------
    const batch = await this.prisma.payrollBatch.upsert({
      where: {
        periodStart_periodEnd: { periodStart, periodEnd },
      },
      create: {
        periodStart,
        periodEnd,
        createdById: createdBy,
        status: 'PROCESSING',
      },
      update: {
        status: 'PROCESSING',
        updatedAt: new Date(),
        createdById: createdBy,
      },
    });

    this.logger.log(`PayrollBatch #${batch.id} upserted.`);

    // ------------------------------------------------------------------
    // 2. Load all active employees with salary information
    // ------------------------------------------------------------------
    const employees = await this.prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        baseSalary: true,
        dailyRate: true,
      },
    });

    this.logger.log(
      `PayrollBatch #${batch.id}: processing ${employees.length} employee(s).`,
    );

    // ------------------------------------------------------------------
    // 3. Build payroll item for each employee
    // ------------------------------------------------------------------
    const items: PayrollItemSummary[] = [];

    for (const emp of employees) {
      try {
        const item = await this.computePayrollItem(
          emp,
          batch.id,
          periodStart,
          periodEnd,
        );
        items.push(item);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `PayrollBatch #${batch.id}: failed to compute item for employee ${emp.id}: ${msg}`,
        );
        // Continue with next employee; the batch will still be partially usable
      }
    }

    // ------------------------------------------------------------------
    // 4. Compute batch totals and mark as COMPLETED
    // ------------------------------------------------------------------
    const totalGross = items.reduce((s, i) => s + i.grossPay, 0);
    const totalNet = items.reduce((s, i) => s + i.netPay, 0);

    await this.prisma.payrollBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        itemCount: items.length,
        totalGross,
        totalNet,
        processedAt: new Date(),
      },
    });

    this.logger.log(
      `PayrollBatch #${batch.id} COMPLETED: ` +
        `${items.length} items, gross=${totalGross}, net=${totalNet}.`,
    );

    return {
      batchId: batch.id,
      periodStart,
      periodEnd,
      createdBy,
      itemCount: items.length,
      totalGross,
      totalNet,
      items,
    };
  }

  // -------------------------------------------------------------------------
  // Per-employee computation
  // -------------------------------------------------------------------------

  private async computePayrollItem(
    emp: {
      id: number;
      employeeCode: string;
      firstName: string;
      lastName: string;
      departmentId: number | null;
      baseSalary: number;
      dailyRate: number;
    },
    batchId: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<PayrollItemSummary> {
    // ------------------------------------------------------------------
    // a. Aggregate attendance results for the period
    // ------------------------------------------------------------------
    const attendance = await this.prisma.attendanceResult.aggregate({
      where: {
        employeeId: emp.id,
        date: { gte: periodStart, lte: periodEnd },
      },
      _sum: {
        workingSeconds: true,
        otSeconds: true,
        mealAllowance: true,
      },
    });

    const totalWorkingSeconds = attendance._sum.workingSeconds ?? 0;
    const totalOtSeconds = attendance._sum.otSeconds ?? 0;
    const totalMealAllowance = attendance._sum.mealAllowance ?? 0;

    // ------------------------------------------------------------------
    // b. Diligence allowance
    // ------------------------------------------------------------------
    const diligenceResult = await this.diligenceCalc.calculateForPeriod(
      emp.id,
      periodStart,
      periodEnd,
      this.ruleEngine,
      this.prisma,
    );
    const diligenceAmount = diligenceResult.amount;

    // ------------------------------------------------------------------
    // c. OT pay
    //    We compute OT in aggregate: total OT seconds vs daily rate.
    //    Weekend vs weekday OT is already encoded in otSeconds by the
    //    attendance engine (future: split weekday/weekend OT seconds).
    // ------------------------------------------------------------------
    const { otPay } = await this.otCalc.calculateOtPay(
      totalOtSeconds,
      emp.dailyRate,
      periodEnd, // Use period-end date for rule version lookup
      false,     // Aggregate: assume weekday rate; engine handles per-day splits
      emp.departmentId ?? undefined,
    );

    // ------------------------------------------------------------------
    // d. Load deduction rules (e.g., social security, tax)
    //    Both rates come from the rule engine.
    // ------------------------------------------------------------------
    const [socialSecurityRate, incomeTaxRate] = await Promise.all([
      this.ruleEngine.getRuleValueAsNumber(
        'DEDUCTIONS',
        'social_security_rate_pct',
        periodEnd,
        emp.departmentId ?? undefined,
      ).catch(() => 0), // gracefully default to 0 if rule not configured
      this.ruleEngine.getRuleValueAsNumber(
        'DEDUCTIONS',
        'income_tax_rate_pct',
        periodEnd,
        emp.departmentId ?? undefined,
      ).catch(() => 0),
    ]);

    // ------------------------------------------------------------------
    // e. Compute gross, deductions, net
    // ------------------------------------------------------------------
    const grossPay =
      emp.baseSalary + totalMealAllowance + diligenceAmount + otPay;

    const socialSecurityDeduction = (grossPay * socialSecurityRate) / 100;
    const incomeTaxDeduction = (grossPay * incomeTaxRate) / 100;
    const totalDeductions = socialSecurityDeduction + incomeTaxDeduction;
    const netPay = grossPay - totalDeductions;

    const summary: PayrollItemSummary = {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      fullName: `${emp.firstName} ${emp.lastName}`,
      totalWorkingSeconds,
      totalOtSeconds,
      totalMealAllowance,
      diligenceAmount,
      otPay,
      baseSalary: emp.baseSalary,
      grossPay,
      totalDeductions,
      netPay,
    };

    // ------------------------------------------------------------------
    // f. Upsert PayrollItem in the database
    // ------------------------------------------------------------------
    await this.prisma.payrollItem.upsert({
      where: {
        batchId_employeeId: { batchId, employeeId: emp.id },
      },
      create: {
        batchId,
        employeeId: emp.id,
        baseSalary: emp.baseSalary,
        totalWorkingSeconds,
        totalOtSeconds,
        totalMealAllowance,
        diligenceAmount,
        otPay,
        grossPay,
        socialSecurityDeduction,
        incomeTaxDeduction,
        totalDeductions,
        netPay,
      },
      update: {
        baseSalary: emp.baseSalary,
        totalWorkingSeconds,
        totalOtSeconds,
        totalMealAllowance,
        diligenceAmount,
        otPay,
        grossPay,
        socialSecurityDeduction,
        incomeTaxDeduction,
        totalDeductions,
        netPay,
        updatedAt: new Date(),
      },
    });

    this.logger.debug(
      `Employee ${emp.id}: gross=${grossPay}, deductions=${totalDeductions}, net=${netPay}.`,
    );

    return summary;
  }
}
