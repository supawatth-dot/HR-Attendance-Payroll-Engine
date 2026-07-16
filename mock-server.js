const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const API_PREFIX = (process.env.API_PREFIX || '/api/v1').replace(/\/$/, '');
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3001';

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

let employees = [
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
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
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
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-07-02T08:00:00.000Z',
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
    createdAt: '2026-01-03T08:00:00.000Z',
    updatedAt: '2026-07-03T08:00:00.000Z',
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
    workingSeconds: 8 * 3600,
    lateSeconds: 0,
    earlyOutSeconds: 0,
    otSeconds: 3600,
    ruleVersionId: 1,
    mealAllowanceAmount: 25,
    diligenceAmount: 300,
    employee: { firstName: 'Somchai', lastName: 'Jaidee' },
  },
  {
    id: 102,
    employeeId: 2,
    date: '2026-07-16',
    missingClock: true,
    isAbsent: false,
    isOnLeave: false,
    isHoliday: false,
    workingSeconds: 7 * 3600 + 1800,
    lateSeconds: 20 * 60,
    earlyOutSeconds: 0,
    otSeconds: 0,
    ruleVersionId: 1,
    mealAllowanceAmount: 0,
    diligenceAmount: 0,
    employee: { firstName: 'Malee', lastName: 'Sombat' },
  },
  {
    id: 103,
    employeeId: 3,
    date: '2026-07-15',
    missingClock: false,
    isAbsent: true,
    isOnLeave: false,
    isHoliday: false,
    workingSeconds: 0,
    lateSeconds: 0,
    earlyOutSeconds: 0,
    otSeconds: 0,
    ruleVersionId: 1,
    mealAllowanceAmount: 0,
    diligenceAmount: 0,
    employee: { firstName: 'Niran', lastName: 'Pongpan' },
  },
];

let payrollBatches = [
  {
    id: 1,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    createdAt: '2026-07-01T09:00:00.000Z',
    status: 'FINALIZED',
    _count: { items: 3 },
  },
];

const ruleCategories = [
  { id: 1, name: 'Attendance Policies' },
  { id: 2, name: 'Allowances' },
];

const ruleDefinitions = [
  { id: 1, categoryId: 1, name: 'Attendance 2026', description: 'Late grace and OT thresholds' },
  { id: 2, categoryId: 2, name: 'Allowances 2026', description: 'Meal and diligence rules' },
];

const ruleVersions = [
  {
    id: 1,
    definitionId: 1,
    versionNumber: 1,
    effectiveFrom: '2026-01-01',
    definition: ruleDefinitions[0],
  },
  {
    id: 2,
    definitionId: 2,
    versionNumber: 1,
    effectiveFrom: '2026-01-01',
    definition: ruleDefinitions[1],
  },
];

const ruleValues = {
  1: [
    { id: 1, key: 'late_grace_minutes', value: '15', valueType: 'number' },
    { id: 2, key: 'ot_minimum_minutes', value: '60', valueType: 'number' },
  ],
  2: [
    { id: 3, key: 'meal_allowance_baht', value: '25', valueType: 'number' },
    { id: 4, key: 'diligence_bonus_baht', value: '300', valueType: 'number' },
  ],
};

const auditLogs = [
  {
    id: 1,
    tableName: 'Employee',
    recordId: 1,
    operation: 'UPDATE',
    changedBy: 1,
    reason: 'Synchronized department assignment',
    timestamp: '2026-07-16T08:00:00.000Z',
  },
  {
    id: 2,
    tableName: 'RuleVersion',
    recordId: 2,
    operation: 'UPDATE',
    changedBy: 1,
    reason: 'Adjusted meal allowance threshold',
    timestamp: '2026-07-15T14:00:00.000Z',
  },
];

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);

  res.writeHead(status, {
    'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json',
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ raw });
      }
    });
  });
}

function paginate(list, page, limit) {
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);
  return {
    data,
    total: list.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(list.length / limit)),
  };
}

function requireAuth(req, res, pathname) {
  if (pathname === '/health' || pathname === `${API_PREFIX}/auth/login`) {
    return true;
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    send(res, 401, { message: 'Unauthorized' });
    return false;
  }

  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  if (!requireAuth(req, res, pathname)) {
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    send(res, 200, { status: 'ok', mode: 'mock', apiPrefix: API_PREFIX });
    return;
  }

  if (req.method === 'POST' && pathname === `${API_PREFIX}/auth/login`) {
    const body = await readBody(req);
    const username = String(body.username || '').toLowerCase();
    const password = String(body.password || '');

    if ((username === 'system' || username === 'admin') && password === 'admin') {
      send(res, 200, {
        access_token: MOCK_TOKEN,
        user: { id: 1, username: 'System', role: 'ADMIN', name: 'System Administrator' },
      });
      return;
    }

    send(res, 401, { message: 'Invalid username or password' });
    return;
  }

  if (req.method === 'GET' && pathname === `${API_PREFIX}/employees`) {
    const search = String(url.searchParams.get('search') || '').toLowerCase();
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Number(url.searchParams.get('limit') || url.searchParams.get('pageSize') || 15);
    const filtered = search
      ? employees.filter((emp) =>
          [emp.firstName, emp.lastName, emp.fullName, emp.employeeCode, emp.email, emp.position]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search))
        )
      : employees;

    send(res, 200, paginate(filtered, page, limit));
    return;
  }

  if (req.method === 'POST' && pathname === `${API_PREFIX}/employees`) {
    const body = await readBody(req);
    const id = employees.length + 1;
    const employee = {
      id,
      employeeCode: `EMP${String(id).padStart(4, '0')}`,
      fullName: `${body.firstName} ${body.lastName}`,
      status: 'active',
      email: `employee${id}@company.local`,
      position: 'Staff',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
      department: departments.find((dept) => dept.id === Number(body.departmentId)) || departments[0],
      shift: shifts.find((shift) => shift.id === Number(body.shiftId)) || shifts[0],
    };
    employees.push(employee);
    send(res, 201, employee);
    return;
  }

  if (req.method === 'DELETE' && pathname.startsWith(`${API_PREFIX}/employees/`)) {
    const id = pathname.split('/').pop();
    employees = employees.filter((emp) => String(emp.id) !== String(id));
    send(res, 200, { success: true });
    return;
  }

  if (req.method === 'GET' && pathname === `${API_PREFIX}/attendance/results`) {
    let filtered = [...attendanceResults];
    if (url.searchParams.get('missingClock') === 'true') {
      filtered = filtered.filter((rec) => rec.missingClock);
    }
    if (url.searchParams.get('isAbsent') === 'true') {
      filtered = filtered.filter((rec) => rec.isAbsent);
    }
    send(res, 200, {
      data: filtered,
      total: filtered.length,
      page: 1,
      pageSize: filtered.length,
    });
    return;
  }

  if (req.method === 'POST' && pathname === `${API_PREFIX}/attendance/run`) {
    const body = await readBody(req);
    send(res, 200, {
      success: true,
      message: `Mock attendance engine executed for ${body.startDate} to ${body.endDate}`,
    });
    return;
  }

  if (req.method === 'POST' && pathname === `${API_PREFIX}/import/attendance`) {
    send(res, 200, {
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
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
    return;
  }

  if (req.method === 'GET' && pathname === `${API_PREFIX}/departments`) {
    send(res, 200, departments);
    return;
  }

  if (req.method === 'GET' && pathname === `${API_PREFIX}/shifts`) {
    send(res, 200, shifts);
    return;
  }

  if (req.method === 'GET' && pathname === `${API_PREFIX}/rules/categories`) {
    send(res, 200, ruleCategories);
    return;
  }

  if (req.method === 'GET' && pathname === `${API_PREFIX}/rules/definitions`) {
    const categoryId = Number(url.searchParams.get('categoryId'));
    send(res, 200, categoryId ? ruleDefinitions.filter((def) => def.categoryId === categoryId) : ruleDefinitions);
    return;
  }

  if (req.method === 'GET' && pathname === `${API_PREFIX}/rules/versions`) {
    const definitionId = Number(url.searchParams.get('definitionId'));
    send(res, 200, definitionId ? ruleVersions.filter((version) => version.definitionId === definitionId) : ruleVersions);
    return;
  }

  const valuesMatch = pathname.match(new RegExp(`^${API_PREFIX}/rules/versions/(\\d+)/values$`));
  if (valuesMatch && req.method === 'GET') {
    send(res, 200, ruleValues[valuesMatch[1]] || []);
    return;
  }
  if (valuesMatch && req.method === 'PUT') {
    const body = await readBody(req);
    ruleValues[valuesMatch[1]] = body.values || [];
    send(res, 200, ruleValues[valuesMatch[1]]);
    return;
  }

  if (req.method === 'GET' && pathname === `${API_PREFIX}/payroll/batches`) {
    send(res, 200, payrollBatches);
    return;
  }

  if (req.method === 'POST' && pathname === `${API_PREFIX}/payroll/generate`) {
    const body = await readBody(req);
    const batch = {
      id: payrollBatches.length + 1,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      createdAt: new Date().toISOString(),
      status: 'FINALIZED',
      _count: { items: employees.length },
    };
    payrollBatches = [batch, ...payrollBatches];
    send(res, 200, batch);
    return;
  }

  const exportMatch = pathname.match(new RegExp(`^${API_PREFIX}/payroll/batches/(\\d+)/export$`));
  if (req.method === 'GET' && exportMatch) {
    const format = url.searchParams.get('format') || 'xlsx';
    const payload = `Mock payroll export for batch ${exportMatch[1]} in ${format} format`;

    if (format === 'pdf') {
      send(res, 200, Buffer.from(payload), { 'Content-Type': 'application/pdf' });
      return;
    }
    if (format === 'csv') {
      send(res, 200, `batch_id,format\n${exportMatch[1]},csv\n`, { 'Content-Type': 'text/csv' });
      return;
    }
    send(res, 200, Buffer.from(payload), {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return;
  }

  if (req.method === 'GET' && pathname === `${API_PREFIX}/audit`) {
    const table = String(url.searchParams.get('table') || '').toLowerCase();
    const filtered = table
      ? auditLogs.filter((log) => log.tableName.toLowerCase().includes(table))
      : auditLogs;
    send(res, 200, filtered);
    return;
  }

  send(res, 404, { message: `No mock route for ${req.method} ${pathname}` });
});

server.listen(PORT, () => {
  console.log(`Mock Backend API running on http://localhost:${PORT}${API_PREFIX}`);
});
