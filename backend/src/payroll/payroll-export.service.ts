/**
 * payroll-export.service.ts
 *
 * Exports payroll data for a PayrollBatch in three formats:
 *   - Excel (.xlsx) via SheetJS
 *   - CSV        via plain string construction
 *   - PDF        via PDFKit (table layout with company header)
 *
 * Each method returns a Buffer that controllers can stream directly to the
 * HTTP response.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Column definitions (shared across all exporters)
// ---------------------------------------------------------------------------

const COLUMNS = [
  { key: 'employeeCode',    header: 'Employee ID',       width: 18 },
  { key: 'fullName',        header: 'Name',              width: 30 },
  { key: 'baseSalary',      header: 'Base Salary',       width: 16 },
  { key: 'otPay',           header: 'OT Pay',            width: 14 },
  { key: 'mealAllowance',   header: 'Meal Allowance',    width: 16 },
  { key: 'diligenceAmount', header: 'Diligence',         width: 14 },
  { key: 'grossPay',        header: 'Gross Pay',         width: 16 },
  { key: 'totalDeductions', header: 'Deductions',        width: 16 },
  { key: 'netPay',          header: 'Net Pay',           width: 16 },
] as const;

type ColKey = typeof COLUMNS[number]['key'];

// ---------------------------------------------------------------------------
// Row type returned from DB query
// ---------------------------------------------------------------------------

interface PayrollRow {
  employeeCode: string;
  fullName: string;
  baseSalary: number;
  otPay: number;
  mealAllowance: number;
  diligenceAmount: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PayrollExportService {
  private readonly logger = new Logger(PayrollExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Exports a PayrollBatch as an Excel (.xlsx) buffer.
   * Includes auto-column widths, a styled header row, and number formatting.
   */
  async exportToExcel(batchId: number): Promise<Buffer> {
    const { batch, rows } = await this.loadBatchData(batchId);

    const worksheetData = [
      // Header row
      COLUMNS.map((c) => c.header),
      // Data rows
      ...rows.map((row) => COLUMNS.map((c) => row[c.key as ColKey])),
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = COLUMNS.map((c) => ({ wch: c.width }));

    // Apply number format to monetary columns (columns 2–8, 0-indexed)
    const moneyFormat = '#,##0.00';
    const moneyColIndices = [2, 3, 4, 5, 6, 7, 8];
    for (let rowIdx = 1; rowIdx < worksheetData.length; rowIdx++) {
      for (const colIdx of moneyColIndices) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].z = moneyFormat;
        }
      }
    }

    const sheetName = `Payroll ${batch.periodStart.toISOString().slice(0, 10)}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
    }) as Buffer;

    this.logger.log(
      `exportToExcel: BatchId=${batchId}, rows=${rows.length}, size=${buffer.length}B`,
    );
    return buffer;
  }

  /**
   * Exports a PayrollBatch as a UTF-8 CSV buffer.
   */
  async exportToCsv(batchId: number): Promise<Buffer> {
    const { rows } = await this.loadBatchData(batchId);

    const header = COLUMNS.map((c) => this.csvEscape(c.header)).join(',');
    const dataLines = rows.map((row) =>
      COLUMNS.map((c) => {
        const val = row[c.key as ColKey];
        return typeof val === 'number'
          ? val.toFixed(2)
          : this.csvEscape(String(val ?? ''));
      }).join(','),
    );

    const csv = [header, ...dataLines].join('\r\n');
    const buffer = Buffer.from(csv, 'utf-8');

    this.logger.log(
      `exportToCsv: BatchId=${batchId}, rows=${rows.length}, size=${buffer.length}B`,
    );
    return buffer;
  }

  /**
   * Exports a PayrollBatch as a PDF buffer using PDFKit.
   *
   * Layout:
   *   - Company header with batch meta-data
   *   - Table with auto-wrapping columns
   *   - Totals row at the bottom
   */
  async exportToPdf(batchId: number): Promise<Buffer> {
    const { batch, rows } = await this.loadBatchData(batchId);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ------------------------------------------------------------------
      // Company header
      // ------------------------------------------------------------------
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('HR Attendance & Payroll Engine', { align: 'center' });

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(
          `Payroll Report – Period: ${batch.periodStart.toISOString().slice(0, 10)} to ${batch.periodEnd.toISOString().slice(0, 10)}`,
          { align: 'center' },
        );

      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .text(
          `Generated: ${new Date().toISOString()} | Batch #${batchId} | Employees: ${rows.length}`,
          { align: 'center' },
        );

      doc.moveDown(1);

      // ------------------------------------------------------------------
      // Table
      // ------------------------------------------------------------------
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidths = this.computePdfColumnWidths(pageWidth);
      const rowHeight = 18;
      const startX = doc.page.margins.left;
      let currentY = doc.y;

      // Helper: draw a single table row
      const drawRow = (
        values: string[],
        y: number,
        isHeader = false,
      ): void => {
        if (isHeader) {
          doc.rect(startX, y, pageWidth, rowHeight).fill('#3B4A6B');
          doc.fillColor('white');
        } else {
          doc.fillColor('#1A1A2E');
        }

        doc.fontSize(isHeader ? 8 : 7.5).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');

        let x = startX;
        values.forEach((val, i) => {
          doc.text(val, x + 2, y + 4, {
            width: colWidths[i] - 4,
            lineBreak: false,
            ellipsis: true,
          });
          x += colWidths[i];
        });

        if (!isHeader) {
          doc.fillColor('#1A1A2E');
        }
      };

      // Header row
      drawRow(COLUMNS.map((c) => c.header), currentY, true);
      currentY += rowHeight;

      // Data rows (with alternating background)
      rows.forEach((row, idx) => {
        if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          currentY = doc.page.margins.top;
          drawRow(COLUMNS.map((c) => c.header), currentY, true);
          currentY += rowHeight;
        }

        const bgColor = idx % 2 === 0 ? '#F0F4FF' : '#FFFFFF';
        doc.rect(startX, currentY, pageWidth, rowHeight).fill(bgColor);
        doc.fillColor('#1A1A2E');

        const values = COLUMNS.map((c) => {
          const val = row[c.key as ColKey];
          return typeof val === 'number' ? val.toFixed(2) : String(val ?? '');
        });
        drawRow(values, currentY, false);
        currentY += rowHeight;
      });

      // ------------------------------------------------------------------
      // Totals row
      // ------------------------------------------------------------------
      const totalGross = rows.reduce((s, r) => s + r.grossPay, 0);
      const totalDeductions = rows.reduce((s, r) => s + r.totalDeductions, 0);
      const totalNet = rows.reduce((s, r) => s + r.netPay, 0);

      currentY += 4;
      doc.rect(startX, currentY, pageWidth, rowHeight).fill('#2D3561');
      doc.fillColor('white').fontSize(8).font('Helvetica-Bold');

      const totalValues: string[] = COLUMNS.map((c) => {
        if (c.key === 'employeeCode') return 'TOTALS';
        if (c.key === 'fullName') return '';
        if (c.key === 'grossPay') return totalGross.toFixed(2);
        if (c.key === 'totalDeductions') return totalDeductions.toFixed(2);
        if (c.key === 'netPay') return totalNet.toFixed(2);
        return '';
      });

      let tx = startX;
      totalValues.forEach((val, i) => {
        doc.text(val, tx + 2, currentY + 4, {
          width: colWidths[i] - 4,
          lineBreak: false,
        });
        tx += colWidths[i];
      });

      doc.end();

      this.logger.log(
        `exportToPdf: BatchId=${batchId}, rows=${rows.length}`,
      );
    });
  }

  // -------------------------------------------------------------------------
  // Shared data loader
  // -------------------------------------------------------------------------

  private async loadBatchData(batchId: number): Promise<{
    batch: { id: number; periodStart: Date; periodEnd: Date };
    rows: PayrollRow[];
  }> {
    const batch = await this.prisma.payrollBatch.findUnique({
      where: { id: batchId },
      select: { id: true, periodStart: true, periodEnd: true, status: true },
    });

    if (!batch) {
      throw new NotFoundException(`PayrollBatch #${batchId} not found.`);
    }

    const items = await this.prisma.payrollItem.findMany({
      where: { batchId },
      orderBy: { employee: { employeeCode: 'asc' } },
      include: {
        employee: {
          select: { employeeCode: true, firstName: true, lastName: true },
        },
      },
    });

    const rows: PayrollRow[] = items.map((item) => ({
      employeeCode: item.employee.employeeCode,
      fullName: `${item.employee.firstName} ${item.employee.lastName}`,
      baseSalary: item.baseSalary,
      otPay: item.otPay,
      mealAllowance: item.totalMealAllowance,
      diligenceAmount: item.diligenceAmount,
      grossPay: item.grossPay,
      totalDeductions: item.totalDeductions,
      netPay: item.netPay,
    }));

    return { batch, rows };
  }

  // -------------------------------------------------------------------------
  // PDF column width helper
  // -------------------------------------------------------------------------

  /** Distributes page width proportionally to each column's configured width. */
  private computePdfColumnWidths(pageWidth: number): number[] {
    const totalConfigWidth = COLUMNS.reduce((s, c) => s + c.width, 0);
    return COLUMNS.map((c) => (c.width / totalConfigWidth) * pageWidth);
  }

  // -------------------------------------------------------------------------
  // CSV helper
  // -------------------------------------------------------------------------

  /** Escapes a value for CSV inclusion (wraps in quotes if necessary). */
  private csvEscape(value: string): string {
    if (/[",\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
