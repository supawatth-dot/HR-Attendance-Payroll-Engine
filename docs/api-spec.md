# API Reference – HR Attendance & Payroll Engine

> **Base URL:** `http://localhost:3000/api/v1`  
> **Auth:** All protected endpoints require `Authorization: Bearer <JWT>` header.  
> **Version:** 1.0.0

---

## Global Response Envelope

```jsonc
// Success
{ "data": { ... }, "meta": { "page": 1, "total": 100 } }

// Error
{ "statusCode": 400, "message": "Validation failed", "errors": [ ... ] }
```

---

## 1. Authentication (`/auth`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `POST` | `/auth/login` | ❌ | Obtain JWT access token | `{ email, password }` | `{ accessToken, expiresIn }` |
| `POST` | `/auth/refresh` | ❌ | Refresh expired access token | `{ refreshToken }` | `{ accessToken, expiresIn }` |
| `POST` | `/auth/logout` | ✅ | Invalidate current session | — | `204 No Content` |
| `GET` | `/auth/me` | ✅ | Get current authenticated user profile | — | `User` object |
| `PATCH` | `/auth/change-password` | ✅ | Change own password | `{ currentPassword, newPassword }` | `{ message }` |

---

## 2. Employees (`/employees`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `GET` | `/employees` | ✅ | List all employees (paginated, filterable by dept/status) | Query: `page, limit, departmentId, status` | `Employee[]` + pagination meta |
| `POST` | `/employees` | ✅ HR_MANAGER+ | Create a new employee record | `CreateEmployeeDto` | `Employee` |
| `GET` | `/employees/:id` | ✅ | Get employee by ID | — | `Employee` (full profile) |
| `PATCH` | `/employees/:id` | ✅ HR_MANAGER+ | Update employee fields | `UpdateEmployeeDto` (partial) | `Employee` |
| `DELETE` | `/employees/:id` | ✅ SUPER_ADMIN | Soft-delete (deactivate) an employee | — | `204 No Content` |
| `GET` | `/employees/:id/attendance` | ✅ | Get attendance history for one employee | Query: `from, to` | `AttendanceRecord[]` |
| `GET` | `/employees/:id/leaves` | ✅ | Get leave requests for one employee | Query: `status, year` | `Leave[]` |
| `GET` | `/employees/:id/payslips` | ✅ | Get payslip history for one employee | Query: `year` | `Payslip[]` |

**`CreateEmployeeDto` fields:** `firstName`, `lastName`, `email`, `phone`, `departmentId`, `shiftId`, `hireDate`, `salary`, `position`, `employmentType` (FULL_TIME | PART_TIME | CONTRACT)

---

## 3. Departments (`/departments`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `GET` | `/departments` | ✅ | List all departments | — | `Department[]` |
| `POST` | `/departments` | ✅ HR_MANAGER+ | Create department | `{ name, description, managerId }` | `Department` |
| `GET` | `/departments/:id` | ✅ | Get department with member count | — | `Department` |
| `PATCH` | `/departments/:id` | ✅ HR_MANAGER+ | Update department | `{ name?, description?, managerId? }` | `Department` |
| `DELETE` | `/departments/:id` | ✅ SUPER_ADMIN | Delete department (only if no members) | — | `204 No Content` |
| `GET` | `/departments/:id/employees` | ✅ | List employees in department | — | `Employee[]` |

---

## 4. Shifts (`/shifts`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `GET` | `/shifts` | ✅ | List all shift definitions | — | `Shift[]` |
| `POST` | `/shifts` | ✅ HR_MANAGER+ | Create shift | `{ name, startTime, endTime, breakMinutes }` | `Shift` |
| `GET` | `/shifts/:id` | ✅ | Get shift detail | — | `Shift` |
| `PATCH` | `/shifts/:id` | ✅ HR_MANAGER+ | Update shift | `UpdateShiftDto` | `Shift` |
| `DELETE` | `/shifts/:id` | ✅ SUPER_ADMIN | Delete shift | — | `204 No Content` |
| `POST` | `/shifts/:id/assign` | ✅ HR_MANAGER+ | Assign shift to employees | `{ employeeIds: string[] }` | `{ assigned: number }` |

---

## 5. Holidays (`/holidays`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `GET` | `/holidays` | ✅ | List holidays | Query: `year` | `Holiday[]` |
| `POST` | `/holidays` | ✅ HR_MANAGER+ | Create holiday | `{ name, date, isRecurring }` | `Holiday` |
| `GET` | `/holidays/:id` | ✅ | Get holiday by ID | — | `Holiday` |
| `PATCH` | `/holidays/:id` | ✅ HR_MANAGER+ | Update holiday | `{ name?, date?, isRecurring? }` | `Holiday` |
| `DELETE` | `/holidays/:id` | ✅ HR_MANAGER+ | Delete holiday | — | `204 No Content` |

---

## 6. Leaves (`/leaves`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `GET` | `/leaves` | ✅ | List leave requests (managers see all; employees see own) | Query: `status, employeeId, from, to` | `Leave[]` |
| `POST` | `/leaves` | ✅ | Submit leave request | `{ type, startDate, endDate, reason }` | `Leave` |
| `GET` | `/leaves/:id` | ✅ | Get leave request detail | — | `Leave` |
| `PATCH` | `/leaves/:id` | ✅ | Update own pending leave | `{ reason?, endDate? }` | `Leave` |
| `DELETE` | `/leaves/:id` | ✅ | Cancel own pending leave | — | `204 No Content` |
| `POST` | `/leaves/:id/approve` | ✅ DEPT_HEAD+ | Approve leave request | `{ comment? }` | `Leave` |
| `POST` | `/leaves/:id/reject` | ✅ DEPT_HEAD+ | Reject leave request | `{ comment }` | `Leave` |

**Leave types:** `ANNUAL`, `SICK`, `MATERNITY`, `PATERNITY`, `UNPAID`, `COMPENSATORY`

---

## 7. Attendance (`/attendance`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `POST` | `/attendance/checkin` | ✅ | Record check-in event | `{ employeeId, timestamp?, lat?, lng? }` | `AttendanceRecord` |
| `POST` | `/attendance/checkout` | ✅ | Record check-out event | `{ employeeId, timestamp? }` | `AttendanceRecord` |
| `GET` | `/attendance` | ✅ HR+ | List raw attendance records | Query: `employeeId, from, to, page, limit` | `AttendanceRecord[]` |
| `GET` | `/attendance/results` | ✅ HR+ | List processed attendance results | Query: `employeeId, month, year` | `AttendanceResult[]` |
| `GET` | `/attendance/results/:id` | ✅ | Get single processed result | — | `AttendanceResult` |
| `POST` | `/attendance/process` | ✅ HR_MANAGER+ | Trigger attendance processing for a period | `{ month, year, departmentId? }` | `{ jobId, queued: number }` |
| `PATCH` | `/attendance/:id` | ✅ HR_MANAGER+ | Manual correction of attendance record | `{ checkIn?, checkOut?, note }` | `AttendanceRecord` |

---

## 8. Import (`/import`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `POST` | `/import/attendance` | ✅ HR_MANAGER+ | Upload CSV/Excel file for bulk attendance import | `multipart/form-data: file` | `{ jobId, filename, rows }` |
| `POST` | `/import/employees` | ✅ SUPER_ADMIN | Upload employee bulk import file | `multipart/form-data: file` | `{ jobId, filename, rows }` |
| `GET` | `/import/jobs` | ✅ HR+ | List all import job statuses | Query: `status, page` | `ImportJob[]` |
| `GET` | `/import/jobs/:jobId` | ✅ HR+ | Get status and errors for a specific job | — | `ImportJob` (with `errors[]`) |
| `GET` | `/import/template/attendance` | ✅ | Download attendance import CSV template | — | CSV file download |
| `GET` | `/import/template/employees` | ✅ | Download employee import CSV template | — | CSV file download |

---

## 9. Rules (`/rules`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `GET` | `/rules/definitions` | ✅ HR+ | List all rule definitions | — | `RuleDefinition[]` |
| `POST` | `/rules/definitions` | ✅ SUPER_ADMIN | Create new rule definition | `{ code, description }` | `RuleDefinition` |
| `GET` | `/rules/definitions/:id` | ✅ HR+ | Get rule definition with all versions | — | `RuleDefinition` + `versions[]` |
| `GET` | `/rules/definitions/:id/versions` | ✅ HR+ | List versions for a rule | — | `RuleVersion[]` |
| `POST` | `/rules/definitions/:id/versions` | ✅ SUPER_ADMIN | Create new rule version (future effective date) | `{ effectiveFrom, value: JSON }` | `RuleVersion` |
| `GET` | `/rules/versions/:id` | ✅ HR+ | Get specific rule version | — | `RuleVersion` |
| `PATCH` | `/rules/versions/:id` | ✅ SUPER_ADMIN | Update future rule version (cannot edit past) | `{ value?, effectiveFrom? }` | `RuleVersion` |
| `DELETE` | `/rules/versions/:id` | ✅ SUPER_ADMIN | Delete future rule version | — | `204 No Content` |

---

## 10. Payroll (`/payroll`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `GET` | `/payroll` | ✅ PAYROLL+ | List payroll run summaries | Query: `month, year, status` | `PayrollRun[]` |
| `POST` | `/payroll/run` | ✅ PAYROLL+ | Trigger a payroll calculation run | `{ month, year, departmentId? }` | `{ jobId, status: 'QUEUED' }` |
| `GET` | `/payroll/runs/:id` | ✅ PAYROLL+ | Get payroll run detail | — | `PayrollRun` |
| `GET` | `/payroll/runs/:id/results` | ✅ PAYROLL+ | Get per-employee payroll results for a run | Query: `employeeId?` | `PayrollResult[]` |
| `GET` | `/payroll/payslips/:id` | ✅ | Get individual payslip (own or if HR+) | — | `Payslip` object |
| `GET` | `/payroll/payslips/:id/pdf` | ✅ | Download payslip as PDF | — | PDF file |
| `POST` | `/payroll/runs/:id/approve` | ✅ HR_MANAGER+ | Approve a payroll run | `{ comment? }` | `PayrollRun` |

---

## 11. Audit (`/audit`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `GET` | `/audit` | ✅ SUPER_ADMIN | List audit log entries | Query: `entity, entityId, userId, from, to, page` | `AuditLog[]` |
| `GET` | `/audit/:id` | ✅ SUPER_ADMIN | Get single audit log entry with before/after diff | — | `AuditLog` |

> **Note:** Audit logs are **append-only** and cannot be modified or deleted via the API.

---

## 12. Company Settings (`/company-settings`)

| Method | Path | Auth | Description | Request Body | Response |
|---|---|---|---|---|---|
| `GET` | `/company-settings` | ✅ | Get current company settings | — | `CompanySettings` |
| `PATCH` | `/company-settings` | ✅ SUPER_ADMIN | Update company settings | `UpdateCompanySettingsDto` | `CompanySettings` |
| `GET` | `/company-settings/working-hours` | ✅ | Get standard working hours configuration | — | `WorkingHoursConfig` |
| `PATCH` | `/company-settings/working-hours` | ✅ SUPER_ADMIN | Update working hours configuration | `{ standard, overtime, breakMinutes }` | `WorkingHoursConfig` |

**`CompanySettings` fields:** `companyName`, `taxId`, `address`, `logoUrl`, `defaultCurrency`, `fiscalYearStart`, `payrollCycle` (MONTHLY | BIWEEKLY)

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK – Request succeeded |
| `201` | Created – Resource created |
| `204` | No Content – Successful with no body |
| `400` | Bad Request – Validation error |
| `401` | Unauthorized – Missing or invalid JWT |
| `403` | Forbidden – Insufficient role permissions |
| `404` | Not Found – Resource does not exist |
| `409` | Conflict – Duplicate resource (e.g., duplicate email) |
| `422` | Unprocessable Entity – Business rule violation |
| `500` | Internal Server Error – Unexpected server failure |
