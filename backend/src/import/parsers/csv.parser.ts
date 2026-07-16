/**
 * csv.parser.ts
 *
 * Parses a CSV buffer into RawAttendanceRow objects using csv-parse/sync.
 *
 * Expected CSV columns (case-insensitive header matching):
 *   employee_id  – required
 *   clock_in     – required (ISO-8601 or parseable date-time string)
 *   clock_out    – optional
 *   date         – optional (defaults to date portion of clock_in)
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

// ---------------------------------------------------------------------------
// Shared row type (re-used by ExcelParser and ImportService)
// ---------------------------------------------------------------------------

export interface RawAttendanceRow {
  /** Source row number for error reporting (1-based, excludes header) */
  rowNumber: number;
  employeeId: string;
  clockIn: Date | null;
  clockOut: Date | null;
  date: Date | null;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

@Injectable()
export class CsvParser {
  private readonly logger = new Logger(CsvParser.name);

  /**
   * Parses a UTF-8 CSV buffer and returns an array of RawAttendanceRow.
   * Rows with completely missing required values are still returned so that
   * ImportService can produce per-row error messages.
   *
   * @throws BadRequestException if the buffer cannot be parsed at all
   *         (e.g. binary garbage, wrong encoding).
   */
  parse(buffer: Buffer): RawAttendanceRow[] {
    let rawRecords: Record<string, string>[];

    try {
      rawRecords = parse(buffer, {
        columns: true,           // Use first row as header
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Tolerate ragged rows
        cast: false,              // Keep everything as strings; we parse manually
        bom: true,                // Strip BOM if present (common in Excel exports)
      }) as Record<string, string>[];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`CSV parse error: ${message}`);
    }

    this.logger.log(`CSV parsed – ${rawRecords.length} data rows found.`);

    return rawRecords.map((record, index) =>
      this.mapRecord(record, index + 1),
    );
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Maps a raw CSV record (string dictionary) to a typed RawAttendanceRow.
   * Column names are normalised to lower-case with underscores.
   */
  private mapRecord(
    record: Record<string, string>,
    rowNumber: number,
  ): RawAttendanceRow {
    // Normalise keys so "Employee ID", "employee_id", "EmployeeId" all work
    const normalised = this.normaliseKeys(record);

    const employeeId = (normalised['employee_id'] ?? '').trim();
    const clockInRaw = (normalised['clock_in'] ?? '').trim();
    const clockOutRaw = (normalised['clock_out'] ?? '').trim();
    const dateRaw = (normalised['date'] ?? '').trim();

    const clockIn = clockInRaw ? this.parseDate(clockInRaw) : null;
    const clockOut = clockOutRaw ? this.parseDate(clockOutRaw) : null;

    // Date defaults to the date component of clock_in when not provided
    let date: Date | null = null;
    if (dateRaw) {
      date = this.parseDate(dateRaw);
    } else if (clockIn) {
      date = new Date(
        Date.UTC(
          clockIn.getUTCFullYear(),
          clockIn.getUTCMonth(),
          clockIn.getUTCDate(),
        ),
      );
    }

    return { rowNumber, employeeId, clockIn, clockOut, date };
  }

  /**
   * Converts all keys in a record to lowercase with underscores,
   * so header variations ("Employee ID", "EmployeeId", "employee id") are
   * accepted uniformly.
   */
  private normaliseKeys(
    record: Record<string, string>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      const normKey = key.trim().toLowerCase().replace(/[\s-]+/g, '_');
      result[normKey] = value;
    }
    return result;
  }

  /**
   * Attempts to parse a string into a Date.
   * Returns null if the string is empty or results in an invalid date.
   */
  private parseDate(raw: string): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
}
