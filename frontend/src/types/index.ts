export interface Department {
  id: number;
  name: string;
  managerId?: number;
  _count?: { employees: number };
}

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  lunchBreakMinutes: number;
  overnight: boolean;
}

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  departmentId: number;
  shiftId: number;
  hireDate: string;
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
