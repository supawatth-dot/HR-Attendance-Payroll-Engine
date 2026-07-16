import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for HR Attendance & Payroll Engine...');

  // 1. Seed Rule Categories
  const categories = ['ATTENDANCE', 'MEAL_ALLOWANCE', 'DILIGENCE', 'PAYROLL', 'OT'];
  const categoryMap: Record<string, number> = {};

  for (const name of categories) {
    const cat = await prisma.ruleCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap[name] = cat.id;
  }

  // 2. Seed Rule Definitions & Versions for 2026 Policy
  const ruleDefinitionsData = [
    { category: 'ATTENDANCE', name: 'late_threshold', description: 'Threshold time after which clock-in is counted as late', key: 'late_threshold', value: '09:00', type: 'time' },
    { category: 'ATTENDANCE', name: 'working_hours', description: 'Standard daily working hours', key: 'working_hours', value: '8', type: 'number' },
    { category: 'ATTENDANCE', name: 'lunch_break_minutes', description: 'Standard lunch break duration in minutes', key: 'lunch_break_minutes', value: '60', type: 'number' },
    { category: 'ATTENDANCE', name: 'weekly_hours', description: 'Standard weekly working hours threshold', key: 'weekly_hours', value: '40', type: 'number' },
    { category: 'ATTENDANCE', name: 'ot_threshold_hours', description: 'Daily hours worked after which OT calculation begins', key: 'ot_threshold_hours', value: '8', type: 'number' },
    { category: 'ATTENDANCE', name: 'early_out_threshold', description: 'Time before which clock-out is counted as early out', key: 'early_out_threshold', value: '17:00', type: 'time' },
    { category: 'MEAL_ALLOWANCE', name: 'meal_rate', description: 'Daily meal allowance rate per attendance day', key: 'meal_rate', value: '25', type: 'currency' },
    { category: 'MEAL_ALLOWANCE', name: 'min_working_hours', description: 'Minimum daily working hours required to qualify for meal allowance', key: 'min_working_hours', value: '4', type: 'number' },
    { category: 'MEAL_ALLOWANCE', name: 'max_late_minutes', description: 'Maximum late minutes allowed before meal allowance is forfeited', key: 'max_late_minutes', value: '30', type: 'number' },
    { category: 'DILIGENCE', name: 'max_amount', description: 'Maximum monthly diligence allowance amount', key: 'max_amount', value: '4000', type: 'currency' },
    { category: 'DILIGENCE', name: 'absent_penalty_pct', description: 'Percentage deduction from max diligence per absent day', key: 'absent_penalty_pct', value: '25', type: 'percentage' },
    { category: 'DILIGENCE', name: 'max_late_minutes_per_day', description: 'Late minutes threshold that counts towards diligence forfeiture', key: 'max_late_minutes_per_day', value: '15', type: 'number' },
    { category: 'OT', name: 'ot_rate_multiplier', description: 'Standard weekday overtime hourly rate multiplier', key: 'ot_rate_multiplier', value: '1.5', type: 'number' },
    { category: 'OT', name: 'weekend_ot_rate_multiplier', description: 'Weekend or holiday overtime hourly rate multiplier', key: 'weekend_ot_rate_multiplier', value: '2.0', type: 'number' },
  ];

  for (const defData of ruleDefinitionsData) {
    const categoryId = categoryMap[defData.category];
    let def = await prisma.ruleDefinition.findFirst({
      where: { categoryId, name: defData.name },
    });
    if (!def) {
      def = await prisma.ruleDefinition.create({
        data: {
          categoryId,
          name: defData.name,
          code: defData.key,
          description: defData.description,
          effectiveDate: new Date('2026-01-01T00:00:00Z'),
        },
      });
    }

    let version = await prisma.ruleVersion.findFirst({
      where: { definitionId: def.id, versionNumber: 1 },
    });
    if (!version) {
      version = await prisma.ruleVersion.create({
        data: {
          definitionId: def.id,
          versionNumber: 1,
          effectiveFrom: new Date('2026-01-01T00:00:00Z'),
          effectiveTo: null,
          isActive: true,
          // rule-engine reads the denormalised JSON value on the version…
          value: defData.value,
          // …while the rules admin API reads the normalised RuleValue rows.
          values: {
            create: [
              { key: defData.key, value: defData.value, valueType: defData.type },
            ],
          },
        },
      });
    }
  }

  // 3. Seed Department & Shift
  const department = await prisma.department.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Executive & Admin Hierarchy' },
  });

  const shift = await prisma.shift.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Standard Day Shift (08:00 - 17:00)',
      startTime: '08:00',
      endTime: '17:00',
      lunchBreakMinutes: 60,
      overnight: false,
    },
  });

  // 4. Seed Admin Employee
  const employee = await prisma.employee.upsert({
    where: { id: 1 },
    update: {},
    create: {
      employeeCode: 'EMP-0001',
      email: 'admin@hr.local',
      firstName: 'System',
      lastName: 'Administrator',
      departmentId: department.id,
      shiftId: shift.id,
      baseSalary: 60000,
      dailyRate: 2000,
      isActive: true,
      hireDate: new Date('2026-01-01T00:00:00Z'),
    },
  });

  // -------------------------------------------------------------------------
  // 5. Seed a realistic demo dataset (departments, employees, attendance)
  //    so dashboards have non-zero data. Skipped once data already exists so
  //    the seed stays safe to re-run.
  // -------------------------------------------------------------------------
  const existingResults = await prisma.attendanceResult.count();
  if (existingResults > 0) {
    console.log(
      `ℹ️  ${existingResults} attendance result(s) already present – skipping demo data generation.`,
    );
  } else {
    // A rule version is required on every AttendanceResult (FK). Any active
    // version works for demo purposes; pick the first one that was seeded.
    const ruleVersion = await prisma.ruleVersion.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!ruleVersion) throw new Error('No rule version seeded – cannot attach results.');
    const ruleVersionId = ruleVersion.id;

    // Deterministic PRNG so the dataset is identical on every fresh seed.
    let rngState = 20260601;
    const rand = () => {
      rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
      return rngState / 0x7fffffff;
    };
    const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

    // Departments beyond the seeded "Executive & Admin Hierarchy".
    const deptNames = [
      'Workshop',
      'Warehouse',
      'Service',
      'FI & CO',
      'Human Resources',
      'IT Support',
    ];
    const departments = [department];
    for (const name of deptNames) {
      departments.push(await prisma.department.create({ data: { name } }));
    }

    // Employees spread across departments.
    const firstNames = ['Somchai', 'Suda', 'Anan', 'Nid', 'Wichai', 'Pim', 'Krit', 'Ploy', 'Nattapong', 'Rungtiwa', 'Chai', 'Mai', 'Thanawat', 'Kanya', 'Peerapong', 'Siriporn', 'Decha', 'Waraporn', 'Adisak', 'Benjawan'];
    const lastNames = ['Srisai', 'Wongchai', 'Thongdee', 'Prasert', 'Chaiyaporn', 'Boonmee', 'Sukjai', 'Rattana', 'Panya', 'Meesuk'];

    const MEAL_RATE = 25;
    const employees: { id: number; departmentId: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const dept = pick(departments);
      const code = `EMP-${String(1000 + i).padStart(4, '0')}`;
      const emp = await prisma.employee.create({
        data: {
          employeeCode: code,
          email: `${firstNames[i % firstNames.length].toLowerCase()}.${i}@hr.local`,
          firstName: firstNames[i % firstNames.length],
          lastName: pick(lastNames),
          departmentId: dept.id,
          shiftId: shift.id,
          baseSalary: 18000 + Math.floor(rand() * 12) * 1000,
          dailyRate: 600 + Math.floor(rand() * 8) * 50,
          isActive: true,
          hireDate: new Date('2026-01-01T00:00:00Z'),
        },
      });
      employees.push({ id: emp.id, departmentId: dept.id });
    }

    // Weekdays of June 2026 (working days).
    const workdays: Date[] = [];
    for (let d = 1; d <= 30; d++) {
      const date = new Date(Date.UTC(2026, 5, d));
      const dow = date.getUTCDay();
      if (dow !== 0 && dow !== 6) workdays.push(date);
    }

    let resultCount = 0;
    let mealCount = 0;
    let leaveCount = 0;

    for (const emp of employees) {
      for (const date of workdays) {
        const roll = rand();

        // ~4% of days recorded as leave rather than an attendance result.
        if (roll < 0.04) {
          await prisma.leave.create({
            data: {
              employeeId: emp.id,
              startDate: date,
              endDate: date,
              type: pick(['ANNUAL', 'SICK', 'PERSONAL']),
              approvedBy: 1,
            },
          });
          leaveCount++;
          continue;
        }

        // ~3% absent (no clock records at all).
        const absent = roll >= 0.04 && roll < 0.07;
        const missingClock = absent;
        // ~12% late arrival.
        const isLate = !absent && rand() < 0.12;
        const lateSeconds = isLate ? (5 + Math.floor(rand() * 40)) * 60 : 0;
        // Base 8h day, occasionally with overtime.
        const otMinutes = !absent && rand() < 0.25 ? 30 + Math.floor(rand() * 120) : 0;
        const otSeconds = otMinutes * 60;
        const workingSeconds = absent ? 0 : 8 * 3600 + otSeconds;
        const earlyOutSeconds = 0;

        // Meal allowance: present, worked >= 4h, and not more than 30m late.
        const eligibleForMeal =
          !absent && workingSeconds >= 4 * 3600 && lateSeconds <= 30 * 60;
        const mealAllowance = eligibleForMeal ? MEAL_RATE : 0;

        await prisma.attendanceResult.create({
          data: {
            employeeId: emp.id,
            date,
            workingSeconds,
            lateSeconds,
            earlyOutSeconds,
            otSeconds,
            isAbsent: absent,
            missingClock,
            mealAllowance,
            ruleVersionId,
          },
        });
        resultCount++;
        if (eligibleForMeal) mealCount++;
      }
    }

    console.log(
      `✅ Demo data: ${employees.length} employees, ${resultCount} attendance results, ${mealCount} meal allowances, ${leaveCount} leaves.`,
    );
  }

  console.log('✅ Seed completed successfully!');
  console.log(`Initial Admin Employee ID: ${employee.id} (${employee.firstName} ${employee.lastName})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
