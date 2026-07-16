'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { DollarSign, Download, Play, CheckCircle2, FileSpreadsheet, FileText, Calendar, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api, { API_BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { getDateLocale, useLocale } from '@/lib/locale';

export default function PayrollPage() {
  const { locale } = useLocale();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [periodStart, setPeriodStart] = useState('2026-01-01');
  const [periodEnd, setPeriodEnd] = useState('2026-01-31');
  const [message, setMessage] = useState<string | null>(null);
  const dateLocale = getDateLocale(locale);
  const copy = locale === 'th'
    ? {
        title: 'ศูนย์สร้างและส่งออกเงินเดือน',
        subtitle: 'สรุปชั่วโมงทำงาน โอที เบี้ยขยัน และค่าอาหารจากข้อมูลเวลาเข้างานเป็นรอบจ่ายเงินเดือนที่พร้อมใช้งาน',
        runSuccess: (start: string, end: string) => `คำนวณรอบเงินเดือนสำหรับ ${start} ถึง ${end} เรียบร้อยแล้ว`,
        runError: (detail: string) => `เกิดข้อผิดพลาดในการคำนวณเงินเดือน: ${detail}`,
        payPeriodStart: 'เริ่มงวดจ่าย:',
        payPeriodEnd: 'สิ้นสุดงวดจ่าย:',
        generate: 'คำนวณและปิดรอบ',
        batchId: 'รหัสรอบ',
        payPeriod: 'งวดจ่าย',
        createdAt: 'สร้างเมื่อ',
        status: 'สถานะ',
        employeeItems: 'พนักงาน / รายการ',
        exportReports: 'ส่งออกรายงาน',
        loading: 'กำลังโหลดประวัติรอบจ่ายเงินเดือน...',
        empty: 'ยังไม่มีรอบเงินเดือน ลองเลือกช่วงวันที่และกด "คำนวณและปิดรอบ"',
        finalized: 'สรุปแล้ว',
        enrolledStaff: (count: number) => `${count} พนักงาน`,
        excel: 'Excel (.xlsx)',
        csv: 'CSV',
        pdf: 'สลิป PDF',
      }
    : {
        title: 'Payroll Generation & Export Hub',
        subtitle: 'Aggregates attendance working hours, overtime pay, diligence bonuses, and meal allowances into finalized pay runs.',
        runSuccess: (start: string, end: string) => `Successfully computed payroll batch for ${start} to ${end}`,
        runError: (detail: string) => `Error generating payroll: ${detail}`,
        payPeriodStart: 'Pay Period Start:',
        payPeriodEnd: 'Pay Period End:',
        generate: 'Calculate & Finalize Batch',
        batchId: 'Batch ID',
        payPeriod: 'Pay Period',
        createdAt: 'Created At',
        status: 'Status',
        employeeItems: 'Employees / Items',
        exportReports: 'Export Reports',
        loading: 'Loading payroll run history...',
        empty: 'No payroll batches generated yet. Select dates above and click `Calculate & Finalize Batch`.',
        finalized: 'FINALIZED',
        enrolledStaff: (count: number) => `${count} enrolled staff`,
        excel: 'Excel (.xlsx)',
        csv: 'CSV',
        pdf: 'PDF Slip',
      };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payroll/batches');
      setBatches(res.data || []);
    } catch (e) {
      console.error('Failed fetching payroll batches', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleGenerateBatch = async () => {
    try {
      setGenerating(true);
      setMessage(null);
      await api.post('/payroll/generate', { periodStart, periodEnd });
      setMessage(copy.runSuccess(periodStart, periodEnd));
      await fetchBatches();
    } catch (e: any) {
      setMessage(copy.runError(e.response?.data?.message || e.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = (batchId: number, format: 'xlsx' | 'csv' | 'pdf') => {
    const url = `${API_BASE_URL}/payroll/batches/${batchId}/export?format=${format}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <DollarSign className="text-emerald-400" /> {copy.title}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Generator Box */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <Calendar size={16} className="text-indigo-400" />
            <span>{copy.payPeriodStart}</span>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <span>{copy.payPeriodEnd}</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateBatch}
          disabled={generating}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50"
        >
          {generating ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Play size={16} className="fill-white" />
          )}
          <span>{copy.generate}</span>
        </button>
      </div>

      {/* Batches Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.batchId}</TableHead>
              <TableHead>{copy.payPeriod}</TableHead>
              <TableHead>{copy.createdAt}</TableHead>
              <TableHead>{copy.status}</TableHead>
              <TableHead>{copy.employeeItems}</TableHead>
              <TableHead className="text-right">{copy.exportReports}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-emerald-400" />
                    <span>{copy.loading}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
                  {copy.empty}
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-xs font-bold text-indigo-400">
                    BATCH #{batch.id}
                  </TableCell>
                  <TableCell className="font-semibold text-white">
                    {formatDate(batch.periodStart, dateLocale)} — {formatDate(batch.periodEnd, dateLocale)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-400">
                    {formatDate(batch.createdAt, dateLocale)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">{copy.finalized}</Badge>
                  </TableCell>
                  <TableCell className="text-neutral-300 font-medium">
                    {copy.enrolledStaff(batch._count?.items || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleExport(batch.id, 'xlsx')}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold transition-all"
                      >
                        <FileSpreadsheet size={14} /> {copy.excel}
                      </button>
                      <button
                        onClick={() => handleExport(batch.id, 'csv')}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 text-xs font-semibold transition-all"
                      >
                        <Download size={14} /> {copy.csv}
                      </button>
                      <button
                        onClick={() => handleExport(batch.id, 'pdf')}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 text-xs font-semibold transition-all"
                      >
                        <FileText size={14} /> {copy.pdf}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
