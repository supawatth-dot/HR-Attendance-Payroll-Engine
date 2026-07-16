-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "managerId" INTEGER,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "lunchBreakMinutes" INTEGER NOT NULL,
    "overnight" BOOLEAN NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "approvedBy" INTEGER,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRaw" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "sourceFile" TEXT,
    "importBatchId" INTEGER NOT NULL,

    CONSTRAINT "AttendanceRaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceResult" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "workingSeconds" INTEGER NOT NULL,
    "lateSeconds" INTEGER NOT NULL,
    "earlyOutSeconds" INTEGER NOT NULL,
    "otSeconds" INTEGER NOT NULL,
    "absent" BOOLEAN NOT NULL,
    "missingClock" BOOLEAN NOT NULL,
    "ruleVersionId" INTEGER NOT NULL,

    CONSTRAINT "AttendanceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealAllowanceResult" (
    "id" SERIAL NOT NULL,
    "attendanceResultId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "ruleVersionId" INTEGER NOT NULL,

    CONSTRAINT "MealAllowanceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceResult" (
    "id" SERIAL NOT NULL,
    "attendanceResultId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "ruleVersionId" INTEGER NOT NULL,

    CONSTRAINT "DiligenceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollBatch" (
    "id" SERIAL NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "PayrollBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" SERIAL NOT NULL,
    "payrollBatchId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "grossAmount" DECIMAL(65,30) NOT NULL,
    "deductions" DECIMAL(65,30) NOT NULL,
    "netAmount" DECIMAL(65,30) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "errorReport" TEXT,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "changedBy" INTEGER NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "RuleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleDefinition" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formulaTemplate" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "RuleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleVersion" (
    "id" SERIAL NOT NULL,
    "definitionId" INTEGER NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "RuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleValue" (
    "id" SERIAL NOT NULL,
    "ruleVersionId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,

    CONSTRAINT "RuleValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "CompanySetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MealAllowanceResult_attendanceResultId_key" ON "MealAllowanceResult"("attendanceResultId");

-- CreateIndex
CREATE UNIQUE INDEX "DiligenceResult_attendanceResultId_key" ON "DiligenceResult"("attendanceResultId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleCategory_name_key" ON "RuleCategory"("name");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRaw" ADD CONSTRAINT "AttendanceRaw_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRaw" ADD CONSTRAINT "AttendanceRaw_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceResult" ADD CONSTRAINT "AttendanceResult_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceResult" ADD CONSTRAINT "AttendanceResult_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "RuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealAllowanceResult" ADD CONSTRAINT "MealAllowanceResult_attendanceResultId_fkey" FOREIGN KEY ("attendanceResultId") REFERENCES "AttendanceResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealAllowanceResult" ADD CONSTRAINT "MealAllowanceResult_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "RuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceResult" ADD CONSTRAINT "DiligenceResult_attendanceResultId_fkey" FOREIGN KEY ("attendanceResultId") REFERENCES "AttendanceResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceResult" ADD CONSTRAINT "DiligenceResult_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "RuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollBatchId_fkey" FOREIGN KEY ("payrollBatchId") REFERENCES "PayrollBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleDefinition" ADD CONSTRAINT "RuleDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RuleCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleVersion" ADD CONSTRAINT "RuleVersion_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "RuleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleValue" ADD CONSTRAINT "RuleValue_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "RuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
