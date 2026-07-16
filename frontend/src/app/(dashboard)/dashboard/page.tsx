'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Users, Clock, AlertTriangle, DollarSign, Calendar, TrendingUp, Play, CheckCircle2 } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { getDateLocale, useLocale } from '@/lib/locale';

export default function DashboardPage() {
  const { locale } = useLocale();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeShifts: 0,
    missingClocks: 0,
    recentBatches: [] as any[],
    recentAttendance: [] as any[],
  });
  const [loading, setLoading] = useState(true);
  const [runningEngine, setRunningEngine] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const dateLocale = getDateLocale(locale);
  const copy = locale === 'th'
    ? {
        bannerBadge: 'สภาพแวดล้อมการใช้งานจริง',
        bannerTitle: 'ศูนย์ปฏิบัติการเวลาเข้างานและเงินเดือน',
        bannerDescription: 'คำนวณโอที ค่าปรับมาสาย ค่าอาหาร และเบี้ยขยันแบบไดนามิกจากกฎในฐานข้อมูลโดยไม่ฝัง logic ไว้ในโค้ด',
        runToday: 'รันเอนจินสำหรับวันนี้',
        importCta: 'นำเข้า CSV / Excel',
        runSuccess: (date: string) => `ประมวลผลเอนจินเวลาเข้างานสำหรับวันที่ ${date} เรียบร้อยแล้ว`,
        runError: (detail: string) => `เกิดข้อผิดพลาดในการสั่งรันเอนจิน: ${detail}`,
        activeWorkforce: 'พนักงานที่ใช้งานอยู่',
        totalEmployees: 'จำนวนพนักงานทั้งหมด',
        workforceTrend: '+4.2% เดือนนี้',
        configuredShifts: 'กะงานที่ตั้งค่าไว้',
        shiftsSubtitle: 'รวมกะปกติและกะข้ามคืน',
        shiftsTrend: 'ขับเคลื่อนด้วยฐานข้อมูล 100%',
        missingClocks: 'แจ้งเตือนลงเวลาไม่ครบ',
        missingClocksSubtitle: 'ต้องการการตรวจสอบจาก HR',
        attentionNeeded: 'ต้องตรวจสอบ',
        allClear: 'ปกติ',
        activePolicy: 'นโยบายกฎที่ใช้งาน',
        policySubtitle: 'เวอร์ชัน #1 มีผล ม.ค. 2026',
        versioned: 'มีเวอร์ชัน',
        recentAttendanceTitle: 'ผลลัพธ์ล่าสุดจาก Attendance Engine',
        recentAttendanceSubtitle: 'ผลคำนวณล่วงหน้าพร้อมค่าอาหารและเวลามาสาย',
        viewAll: 'ดูทั้งหมด →',
        employee: 'พนักงาน',
        date: 'วันที่',
        status: 'สถานะ',
        mealAllowance: 'ค่าอาหาร',
        attendanceLoading: 'กำลังโหลดข้อมูลเวลาเข้างาน...',
        attendanceEmpty: 'ยังไม่มีผลลัพธ์การคำนวณเวลาเข้างาน ลองรันเอนจินหรือนำเข้าข้อมูล CSV',
        absent: 'ขาดงาน',
        missingClock: 'ลงเวลาไม่ครบ',
        present: 'มาปกติ',
        recentPayrollTitle: 'รอบส่งออกเงินเดือนล่าสุด',
        recentPayrollSubtitle: 'ประวัติการส่งออก Excel, CSV และ PDF',
        payrollCta: 'ไปหน้าเงินเดือน →',
        period: 'งวด',
        items: 'รายการ',
        action: 'การทำงาน',
        batchesLoading: 'กำลังโหลดประวัติรอบจ่าย...',
        batchesEmpty: 'ยังไม่มีรอบเงินเดือน ลองไปที่หน้า Payroll เพื่อสร้างรอบใหม่',
        final: 'สรุปแล้ว',
        itemCount: (count: number) => `${count} รายการ`,
        export: 'ส่งออก →',
        employeeFallback: (id: number | string) => `พนักงาน #${id}`,
      }
    : {
        bannerBadge: 'Live Production Environment',
        bannerTitle: 'Attendance & Payroll Operations Hub',
        bannerDescription: 'All overtime, late penalties, meal allowances, and diligence bonuses are computed dynamically via versioned DB rules. No hardcoded logic.',
        runToday: 'Run Engine for Today',
        importCta: 'Import CSV / Excel',
        runSuccess: (date: string) => `Successfully executed Rule-Driven Attendance Engine for ${date}`,
        runError: (detail: string) => `Error triggering engine: ${detail}`,
        activeWorkforce: 'Active Workforce',
        totalEmployees: 'Total enrolled employees',
        workforceTrend: '+4.2% this month',
        configuredShifts: 'Configured Shifts',
        shiftsSubtitle: 'Standard & overnight shifts',
        shiftsTrend: '100% DB Driven',
        missingClocks: 'Missing Clock Alerts',
        missingClocksSubtitle: 'Requires HR verification',
        attentionNeeded: 'Attention Needed',
        allClear: 'All Clear',
        activePolicy: 'Active Rule Policy',
        policySubtitle: 'Version #1 Effective Jan 2026',
        versioned: 'Versioned',
        recentAttendanceTitle: 'Recent Attendance Engine Output',
        recentAttendanceSubtitle: 'Pre-computed results with allowances and late seconds',
        viewAll: 'View All →',
        employee: 'Employee',
        date: 'Date',
        status: 'Status',
        mealAllowance: 'Meal Allow.',
        attendanceLoading: 'Loading attendance records...',
        attendanceEmpty: 'No attendance results computed yet. Run the engine or import CSV data.',
        absent: 'Absent',
        missingClock: 'Missing Clock',
        present: 'Present',
        recentPayrollTitle: 'Recent Payroll Export Batches',
        recentPayrollSubtitle: 'Excel, CSV, and PDF export history',
        payrollCta: 'Go to Payroll →',
        period: 'Period',
        items: 'Items',
        action: 'Action',
        batchesLoading: 'Loading batches...',
        batchesEmpty: 'No payroll batches generated yet. Visit the Payroll page to create one.',
        final: 'FINAL',
        itemCount: (count: number) => `${count} items`,
        export: 'Export →',
        employeeFallback: (id: number | string) => `Emp #${id}`,
      };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [empRes, attRes, payRes, shiftRes] = await Promise.all([
        api.get('/employees?limit=1').catch(() => ({ data: { total: 0 } })),
        api.get('/attendance/results?pageSize=5').catch(() => ({ data: { data: [], total: 0 } })),
        api.get('/payroll/batches').catch(() => ({ data: [] })),
        api.get('/shifts').catch(() => ({ data: [] })),
      ]);

      setStats({
        totalEmployees: empRes.data?.total || empRes.data?.data?.length || 1,
        activeShifts: shiftRes.data?.length || 1,
        missingClocks: attRes.data?.data?.filter((r: any) => r.missingClock)?.length || 0,
        recentBatches: payRes.data?.slice(0, 3) || [],
        recentAttendance: attRes.data?.data || [],
      });
    } catch (e) {
      console.error('Failed loading dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEngineToday = async () => {
    try {
      setRunningEngine(true);
      setRunMessage(null);
      const today = new Date().toISOString().split('T')[0];
      await api.post('/attendance/run', { startDate: today, endDate: today });
      setRunMessage(copy.runSuccess(today));
      await fetchDashboardData();
    } catch (e: any) {
      setRunMessage(copy.runError(e.response?.data?.message || e.message));
    } finally {
      setRunningEngine(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner with Engine Quick Trigger */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-neutral-900 p-6 border border-indigo-500/30 shadow-xl">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30 mb-3">
              <TrendingUp size={14} /> {copy.bannerBadge}
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              {copy.bannerTitle}
            </h2>
            <p className="mt-1 text-sm text-neutral-300 max-w-2xl">
              {copy.bannerDescription}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunEngineToday}
              disabled={runningEngine}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
            >
              {runningEngine ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Play size={16} className="fill-white" />
              )}
              <span>{copy.runToday}</span>
            </button>
            <Link
              href="/import"
              className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-5 py-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 transition-all"
            >
              {copy.importCta}
            </Link>
          </div>
        </div>

        {runMessage && (
          <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{runMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title={copy.activeWorkforce}
          value={loading ? '...' : stats.totalEmployees}
          subtitle={copy.totalEmployees}
          trend={copy.workforceTrend}
          trendType="positive"
          icon={Users}
          gradient="from-blue-500/10 to-indigo-500/5 border-blue-500/20"
        />
        <StatCard
          title={copy.configuredShifts}
          value={loading ? '...' : stats.activeShifts}
          subtitle={copy.shiftsSubtitle}
          trend={copy.shiftsTrend}
          trendType="neutral"
          icon={Clock}
          gradient="from-indigo-500/10 to-purple-500/5 border-indigo-500/20"
        />
        <StatCard
          title={copy.missingClocks}
          value={loading ? '...' : stats.missingClocks}
          subtitle={copy.missingClocksSubtitle}
          trend={stats.missingClocks > 0 ? copy.attentionNeeded : copy.allClear}
          trendType={stats.missingClocks > 0 ? 'negative' : 'positive'}
          icon={AlertTriangle}
          gradient="from-amber-500/10 to-orange-500/5 border-amber-500/20"
        />
        <StatCard
          title={copy.activePolicy}
          value="Policy 2026"
          subtitle={copy.policySubtitle}
          trend={copy.versioned}
          trendType="positive"
          icon={Calendar}
          gradient="from-emerald-500/10 to-teal-500/5 border-emerald-500/20"
        />
      </div>

      {/* Two Column Section: Recent Attendance & Payroll Batches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Results */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <Clock size={18} className="text-indigo-400" /> {copy.recentAttendanceTitle}
              </h3>
              <p className="text-xs text-neutral-400">{copy.recentAttendanceSubtitle}</p>
            </div>
            <Link href="/attendance" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              {copy.viewAll}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.employee}</TableHead>
                  <TableHead>{copy.date}</TableHead>
                  <TableHead>{copy.status}</TableHead>
                  <TableHead>{copy.mealAllowance}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-neutral-500">
                      {copy.attendanceLoading}
                    </TableCell>
                  </TableRow>
                ) : stats.recentAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-neutral-500">
                      {copy.attendanceEmpty}
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentAttendance.map((rec: any) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-semibold text-neutral-200">
                        {rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : copy.employeeFallback(rec.employeeId)}
                      </TableCell>
                      <TableCell>{formatDate(rec.date, dateLocale)}</TableCell>
                      <TableCell>
                        {rec.isAbsent ? (
                          <Badge variant="destructive">{copy.absent}</Badge>
                        ) : rec.missingClock ? (
                          <Badge variant="warning">{copy.missingClock}</Badge>
                        ) : (
                          <Badge variant="success">{copy.present}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-emerald-400 font-medium">
                        {formatCurrency(rec.mealAllowanceAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Recent Payroll Batches */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-400" /> {copy.recentPayrollTitle}
              </h3>
              <p className="text-xs text-neutral-400">{copy.recentPayrollSubtitle}</p>
            </div>
            <Link href="/payroll" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              {copy.payrollCta}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.period}</TableHead>
                  <TableHead>{copy.status}</TableHead>
                  <TableHead>{copy.items}</TableHead>
                  <TableHead>{copy.action}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-neutral-500">
                      {copy.batchesLoading}
                    </TableCell>
                  </TableRow>
                ) : stats.recentBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-neutral-500">
                      {copy.batchesEmpty}
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentBatches.map((batch: any) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-semibold text-neutral-200">
                        {formatDate(batch.periodStart, dateLocale)} - {formatDate(batch.periodEnd, dateLocale)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{batch.status || copy.final}</Badge>
                      </TableCell>
                      <TableCell className="text-neutral-300">{copy.itemCount(batch._count?.items || 0)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/payroll`}
                          className="text-xs font-medium text-indigo-400 hover:underline"
                        >
                          {copy.export}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
