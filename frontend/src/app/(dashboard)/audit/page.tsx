'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ShieldCheck, Search, RefreshCw, Database } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { getDateLocale, useLocale } from '@/lib/locale';

export default function AuditPage() {
  const { locale } = useLocale();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableName, setTableName] = useState('');
  const dateLocale = getDateLocale(locale);
  const copy = locale === 'th'
    ? {
        title: 'ประวัติการตรวจสอบแบบเปลี่ยนแปลงไม่ได้',
        subtitle: 'บันทึกเพื่อ compliance สำหรับการลงทะเบียนพนักงาน การเปลี่ยนเวอร์ชันนโยบาย และการคำนวณเงินเดือนทั้งหมด',
        placeholder: 'กรองตามชื่อตาราง...',
        timestamp: 'เวลา',
        entity: 'ข้อมูลเป้าหมาย',
        recordId: 'รหัสข้อมูล',
        operation: 'การทำงาน',
        changedBy: 'แก้ไขโดย (รหัสผู้ใช้)',
        reason: 'เหตุผล / หมายเหตุ',
        loading: 'กำลังดึงประวัติ audit จาก PostgreSQL ที่ปลอดภัย...',
        empty: 'ยังไม่มีเหตุการณ์ audit ตามเงื่อนไขที่ระบุ',
        create: 'สร้าง',
        update: 'แก้ไข',
        delete: 'ลบ',
        adminUser: (id: number | string) => `ผู้ใช้แอดมิน #${id}`,
        fallbackReason: 'การทำงานมาตรฐานผ่าน dashboard/API',
      }
    : {
        title: 'Enterprise Immutable Audit Trail',
        subtitle: 'Complete compliance logging for all employee enrollments, rule policy version changes, and payroll calculations.',
        placeholder: 'Filter by table name...',
        timestamp: 'Timestamp',
        entity: 'Target Entity',
        recordId: 'Record ID',
        operation: 'Operation',
        changedBy: 'Changed By (User ID)',
        reason: 'Reason / Notes',
        loading: 'Querying secure audit trail from PostgreSQL...',
        empty: 'No audit events recorded yet for the specified filter criteria.',
        create: 'CREATE',
        update: 'UPDATE',
        delete: 'DELETE',
        adminUser: (id: number | string) => `Admin User #${id}`,
        fallbackReason: 'Standard system action via dashboard/API',
      };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (tableName) params.table = tableName;
      const res = await api.get('/audit', { params });
      setLogs(res.data || []);
    } catch (e) {
      console.error('Failed loading audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tableName]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldCheck className="text-indigo-400" /> {copy.title}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {copy.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder={copy.placeholder}
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-900 pl-9 pr-4 py-1.5 text-xs text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.timestamp}</TableHead>
              <TableHead>{copy.entity}</TableHead>
              <TableHead>{copy.recordId}</TableHead>
              <TableHead>{copy.operation}</TableHead>
              <TableHead>{copy.changedBy}</TableHead>
              <TableHead>{copy.reason}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-indigo-400" />
                    <span>{copy.loading}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
                  {copy.empty}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-neutral-400">
                    {formatDate(log.timestamp, dateLocale)}
                  </TableCell>
                  <TableCell className="font-bold text-white flex items-center gap-2">
                    <Database size={14} className="text-indigo-400" /> {log.tableName}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-indigo-300">
                    #{log.recordId}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.operation === 'CREATE'
                          ? 'success'
                          : log.operation === 'UPDATE'
                          ? 'info'
                          : 'destructive'
                      }
                    >
                      {log.operation === 'CREATE'
                        ? copy.create
                        : log.operation === 'UPDATE'
                        ? copy.update
                        : copy.delete}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-300">
                    {copy.adminUser(log.changedBy)}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-400">
                    {log.reason || copy.fallbackReason}
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
