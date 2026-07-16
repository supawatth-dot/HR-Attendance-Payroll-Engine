import { NextRequest, NextResponse } from 'next/server';

const MOCK_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IlN5c3RlbSBBZG1pbiIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTUxNjIzOTAyMn0.mock-signature';

const departments = [
  { id: 1, name: 'Engineering', code: 'ENG', headCount: 40 },
  { id: 2, name: 'HR', code: 'HR', headCount: 8 },
  { id: 3, name: 'Finance', code: 'FIN', headCount: 10 },
];

const shifts = [
  {
    id: 1,
    name: 'Morning',
    code: 'MOR',
    startTime: '08:00',
    endTime: '17:00',
    workingHours: 8,
    graceMinutes: 15,
    lunchBreakMinutes: 60,
    overnight: false,
  },
  {
    id: 2,
    name: 'Evening',
    code: 'EVE',
    startTime: '13:00',
    endTime: '22:00',
    workingHours: 8,
    graceMinutes: 10,
    lunchBreakMinutes: 60,
    overnight: false,
  },
];

const employees = [
  {
    id: 1,
    employeeCode: 'EMP0001',
    firstName: 'Somchai',
    lastName: 'Jaidee',
    fullName: 'Somchai Jaidee',
    email: 'somchai.jaidee@company.local',
    phone: '0812345678',
    departmentId: 1,
    department: departments[0],
    shiftId: 1,
    shift: shifts[0],
    position: 'Senior Developer',
    status: 'active',
    hireDate: '2024-02-01',
  },
  {
    id: 2,
    employeeCode: 'EMP0002',
    firstName: 'Malee',
    lastName: 'Sombat',
    fullName: 'Malee Sombat',
    email: 'malee.sombat@company.local',
    phone: '0823456789',
    departmentId: 2,
    department: departments[1],
    shiftId: 1,
    shift: shifts[0],
    position: 'HR Manager',
    status: 'active',
    hireDate: '2023-08-15',
  },
  {
    id: 3,
    employeeCode: 'EMP0003',
    firstName: 'Niran',
    lastName: 'Pongpan',
    fullName: 'Niran Pongpan',
    email: 'niran.pongpan@company.local',
    phone: '0834567890',
    departmentId: 3,
    department: departments[2],
    shiftId: 2,
    shift: shifts[1],
    position: 'Accountant',
    status: 'inactive',
    hireDate: '2022-04-10',
  },
];

const attendanceResults = [
  {
    id: 101,
    employeeId: 1,
    date: '2026-07-16',
    missingClock: false,
    isAbsent: false,
    isOnLeave: false,
    isHoliday: false,
    workingSeconds: 28800,
    lateSeconds: 0,
    earlyOutSeconds: 0,
    otSeconds: 3600,
    ruleVersionId: 1,
    mealAllowanceAmount: 25,
    diligenceAmount: 300,
    employee: { firstName: 'Somchai', lastName: 'Jaidee' },
  },
];

const payrollBatches = [
  { id: 1, periodStart: '2026-07-01', periodEnd: '2026-07-15', status: 'FINALIZED', _count: { items: 3 } },
];

const ruleCategories = [
  { id: 1, code: 'OT', name: 'Overtime' },
  { id: 2, code: 'ALLOWANCE', name: 'Allowance' },
];

const ruleDefinitions = [
  { id: 1, categoryId: 1, code: 'OT_RATE', name: 'OT Rate', dataType: 'number' },
  { id: 2, categoryId: 2, code: 'MEAL_ALLOWANCE', name: 'Meal Allowance', dataType: 'number' },
];

const ruleVersions = [
  { id: 1, definitionId: 1, version: 1, status: 'ACTIVE', effectiveFrom: '2026-01-01' },
  { id: 2, definitionId: 2, version: 1, status: 'ACTIVE', effectiveFrom: '2026-01-01' },
];

const ruleValues: Record<string, unknown[]> = {
  '1': [{ id: 1, key: 'weekday_multiplier', value: 1.5 }],
  '2': [{ id: 2, key: 'amount', value: 25 }],
};

const auditLogs = [
  { id: 1, action: 'LOGIN', tableName: 'auth', actor: 'System', createdAt: new Date().toISOString() },
];

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function pathFrom(params: { path?: string[] }) {
  return `/${(params.path || []).join('/')}`;
}

function authed(request: NextRequest, path: string) {
  if (path === '/auth/login') return true;
  return request.headers.get('authorization')?.startsWith('Bearer ');
}

async function handle(request: NextRequest, params: { path?: string[] }) {
  const path = pathFrom(params);
  const { searchParams } = new URL(request.url);

  if (!authed(request, path)) {
    return json({ message: 'Unauthorized' }, 401);
  }

  if (request.method === 'POST' && path === '/auth/login') {
    const body = await request.json().catch(() => ({}));
    const valid =
      (body.username === 'System' && body.password === 'admin') ||
      (body.username === 'admin' && body.password === 'admin');
    if (!valid) return json({ message: 'Invalid credentials' }, 401);

    return json({
      access_token: MOCK_TOKEN,
      user: { id: 1, username: 'System', role: 'ADMIN', name: 'System Administrator' },
    });
  }

  if (request.method === 'GET' && path === '/employees') {
    return json({ data: employees, total: employees.length, page: 1, limit: Number(searchParams.get('limit') || 15), totalPages: 1 });
  }

  if (request.method === 'GET' && path === '/attendance/results') {
    return json({ data: attendanceResults, total: attendanceResults.length, page: 1, pageSize: 5, totalPages: 1 });
  }

  if (request.method === 'POST' && path === '/attendance/run') {
    return json({ processed: employees.length, status: 'completed' });
  }

  if (request.method === 'POST' && path === '/import/attendance') {
    return json({
      id: 'mock-batch-1',
      filename: 'attendance-import.xlsx',
      totalRows: 150,
      successRows: 145,
      errorRows: 5,
      status: 'completed',
      errors: [
        { row: 12, column: 'employee_code', value: 'EMP9999', message: 'Employee not found' },
        { row: 34, column: 'date', value: '2026-13-01', message: 'Invalid date format' },
        { row: 67, column: 'check_in', value: '25:00', message: 'Invalid time value' },
        { row: 89, column: 'employee_code', value: '-', message: 'Employee code is required' },
        { row: 102, column: 'check_out', value: '07:00', message: 'Check-out before check-in' },
      ],
    });
  }

  if (request.method === 'GET' && path === '/departments') return json(departments);
  if (request.method === 'GET' && path === '/shifts') return json(shifts);
  if (request.method === 'GET' && path === '/rules/categories') return json(ruleCategories);
  if (request.method === 'GET' && path === '/rules/definitions') return json(ruleDefinitions);
  if (request.method === 'GET' && path === '/rules/versions') return json(ruleVersions);

  const valuesMatch = path.match(/^\/rules\/versions\/(\d+)\/values$/);
  if (request.method === 'GET' && valuesMatch) return json(ruleValues[valuesMatch[1]] || []);
  if (request.method === 'PUT' && valuesMatch) {
    const body = await request.json().catch(() => ({}));
    return json(body.values || []);
  }

  if (request.method === 'GET' && path === '/payroll/batches') return json(payrollBatches);
  if (request.method === 'POST' && path === '/payroll/generate') {
    const body = await request.json().catch(() => ({}));
    return json({ id: 2, periodStart: body.periodStart, periodEnd: body.periodEnd, status: 'FINALIZED', _count: { items: employees.length } });
  }
  if (request.method === 'GET' && path.match(/^\/payroll\/batches\/\d+\/export$/)) {
    return new NextResponse('batch_id,format\n1,csv\n', { headers: { 'Content-Type': 'text/csv' } });
  }

  if (request.method === 'GET' && path === '/audit') return json(auditLogs);

  return json({ message: `No route for ${request.method} ${path}` }, 404);
}

export async function GET(request: NextRequest, context: { params: { path?: string[] } }) {
  return handle(request, context.params);
}

export async function POST(request: NextRequest, context: { params: { path?: string[] } }) {
  return handle(request, context.params);
}

export async function PUT(request: NextRequest, context: { params: { path?: string[] } }) {
  return handle(request, context.params);
}

export async function DELETE(request: NextRequest, context: { params: { path?: string[] } }) {
  return handle(request, context.params);
}
