export interface Department {
  id: number | string;
  name: string;
  code?: string;
  headCount?: number;
  managerId?: number | string | null;
  _count?: { employees: number };
}

export interface Shift {
  id: number | string;
  name: string;
  code?: string;
  startTime: string;
  endTime: string;
  lunchBreakMinutes?: number;
  workingHours?: number;
  graceMinutes?: number;
  overnight?: boolean;
}

export interface Employee {
  id: number | string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email?: string;
  phone?: string;
  departmentId: number | string;
  shiftId: number | string;
  position?: string;
  status?: string;
  hireDate: string;
  createdAt?: string;
  updatedAt?: string;
  terminationDate?: string | null;
  department?: Department;
  shift?: Shift;
}

export interface AttendanceResultRecord {
  id: number;
  employeeId: number;
  date: string;
  missingClock: boolean;
  isAbsent: boolean;
  isOnLeave: boolean;
  isHoliday: boolean;
  workingSeconds: number;
  lateSeconds: number;
  earlyOutSeconds: number;
  otSeconds: number;
  ruleVersionId: number;
  mealAllowanceAmount: number;
  diligenceAmount: number;
  employee?: Employee;
}

export interface RuleValue {
  id: number;
  ruleVersionId: number;
  key: string;
  value: string;
  valueType: string;
}

export interface RuleVersion {
  id: number;
  definitionId: number;
  versionNumber: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  values: RuleValue[];
}

export interface RuleDefinition {
  id: number;
  categoryId: number;
  name: string;
  description?: string;
  effectiveDate: string;
  versions?: RuleVersion[];
}

export interface RuleCategory {
  id: number;
  name: string;
  definitions?: RuleDefinition[];
}

export interface PayrollItem {
  id: number;
  payrollBatchId: number;
  employeeId: number;
  grossAmount: string | number;
  deductions: string | number;
  netAmount: string | number;
  generatedAt: string;
  employee?: Employee;
}

export interface PayrollBatch {
  id: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  status: string;
  items?: PayrollItem[];
  _count?: { items: number };
}

export interface AuditLogRecord {
  id: number;
  tableName: string;
  recordId: number;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  changedBy: number;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  timestamp: string;
}

export interface ImportBatchError {
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface ImportBatchResult {
  id: number | string;
  filename: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  status: string;
  errors: ImportBatchError[];
  createdAt: string;
  completedAt?: string;
}
