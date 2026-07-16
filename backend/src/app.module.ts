import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { ShiftsModule } from './shifts/shifts.module';
import { HolidaysModule } from './holidays/holidays.module';
import { LeavesModule } from './leaves/leaves.module';
import { AuditModule } from './audit/audit.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';
import { RulesModule } from './rules/rules.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ImportModule } from './import/import.module';
import { PayrollModule } from './payroll/payroll.module';
import { DashboardModule } from './dashboard/dashboard.module';

/**
 * Root application module.
 *
 * Wires together every domain module and registers two global providers:
 *  - ConfigModule  – exposes environment variables across all modules.
 *  - BullModule    – connects BullMQ to Redis for background job queues.
 */
@Module({
  imports: [
    // ── Global config (reads .env / process.env) ────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,         // makes ConfigService available everywhere
      cache: true,            // cache parsed values for performance
      expandVariables: true,  // support ${VAR} expansion in .env
    }),

    // ── BullMQ – async Redis connection via ConfigService ───────────────────
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,  // keep last 100 completed jobs
          removeOnFail: 500,      // keep last 500 failed jobs for inspection
        },
      }),
      inject: [ConfigService],
    }),

    // ── Domain Modules ───────────────────────────────────────────────────────
    PrismaModule,          // Shared Prisma ORM client (singleton)
    AuthModule,            // JWT authentication + RBAC guards
    EmployeesModule,       // Employee CRUD, profile management
    DepartmentsModule,     // Department hierarchy management
    ShiftsModule,          // Shift definitions and assignments
    HolidaysModule,        // Public holiday calendar
    LeavesModule,          // Leave requests and approvals
    AuditModule,           // Immutable audit-trail logging
    CompanySettingsModule, // Global company configuration
    RulesModule,           // Metadata-driven rule engine (RuleDefinition/RuleVersion)
    AttendanceModule,      // Raw check-in/out events + processed results
    ImportModule,          // Bulk data import (CSV / Excel via BullMQ)
    PayrollModule,         // Payroll calculation and payslip generation
    DashboardModule,       // Read-only Overview aggregates
  ],
})
export class AppModule {}
