/**
 * excel.parser.ts
 *
 * Parses an Excel buffer (.xlsx / .xls) into RawAttendanceRow objects
 * using the SheetJS (xlsx) library.
 *
 * Expected columns in the first sheet (case-insensitive):
 *   employee_id  – required
 *   clock_in     – required
 *   clock_out    – optional
 *   date         – optional (defaults to date portion of clock_in)
 *
 * SheetJS can also read .csv files, but CsvParser should be preferred for
 * those so that encoding edge-cases are handled by csv-parse.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { RawAttendanceRow } from './csv.parser';

@Injectable()
export class ExcelParser {
  private readonly logger = new Logger(ExcelParser.name);

  /**
   * Parses an Excel buffer and returns typed RawAttendanceRow objects.
   *
   * @throws BadRequestException if the buffer is not a valid workbook.
   */
  parse(buffer: Buffer): RawAttendanceRow[] {
    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true,   // Convert Excel serial dates → JS Date objects
        cellNF: false,     // Skip number format strings (not needed)
        cellText: false,   // Skip formatted text (not needed)
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Excel parse error: ${message}`);
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException('Excel file contains no sheets.');
    }

    const sheet = workbook.Sheets[firstSheetName];

    // sheet_to_json with header:1 gives us [ [colA, colB, ...], [val, val, ...], ... ]
    // Using header:1 so we can handle the header row ourselves for normalisation.
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,   // Use null for empty cells
      blankrows: false,
    });

    if (rawRows.length < 2) {
      // Nothing to import (empty or header-only sheet)
      this.logger.warn(
        `Excel sheet "${firstSheetName}" has no data rows.`,
      );
      return [];
    }

    // First row is the header
    const headerRow = (rawRows[0] as unknown[]).map((h) =>
      this.normaliseHeader(String(h ?? '')),
    );

    this.logger.log(
      `Excel parsed – sheet="${firstSheetName}", ` +
        `${rawRows.length - 1} data rows, headers=[${headerRow.join(', ')}]`,
    );

    const results: RawAttendanceRow[] = [];

    for (let i = 1; i < rawRows.length; i++) {
      const cells = rawRows[i] as unknown[];
      const record: Record<string, unknown> = {};
      headerRow.forEach((key, colIdx) => {
        record[key] = cells[colIdx] ?? null;
      });
      results.push(this.mapRecord(record, i)); // row number is 1-based data index
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Converts a header string to lowercase_underscored form. */
  private normaliseHeader(raw: string): string {
    return raw.trim().toLowerCase().replace(/[\s\-()]+/g, '_');
  }

  /** Maps a normalised record dictionary to RawAttendanceRow. */
  private mapRecord(
    record: Record<string, unknown>,
    rowNumber: number,
  ): RawAttendanceRow {
    const employeeId = this.extractString(record['employee_id']);
    const clockIn = this.extractDate(record['clock_in']);
    const clockOut = this.extractDate(record['clock_out']);

    let date = this.extractDate(record['date']);
    if (!date && clockIn) {
      // Default date to the UTC calendar date of clock_in
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

  /** Coerces a cell value to a trimmed string. */
  private extractString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  /**
   * Coerces a cell value to a Date.
   *
   * SheetJS (with cellDates:true) already converts Excel date serials to
   * JS Date objects, so we mainly need to handle string fallbacks.
   */
  private extractDate(value: unknown): Date | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    // Fallback: try to parse as string
    const str = String(value).trim();
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
}
