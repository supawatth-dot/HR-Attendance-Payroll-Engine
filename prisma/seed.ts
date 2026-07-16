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
      firstName: 'System',
      lastName: 'Administrator',
      departmentId: department.id,
      shiftId: shift.id,
      hireDate: new Date('2026-01-01T00:00:00Z'),
    },
  });

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
