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

export default function DashboardPage() {
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

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-indigo-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
        />
        <StatCard
          title="Active Shifts"
          value={stats.activeShifts}
          icon={Clock}
        />
        <StatCard
          title="Missing Clocks"
          value={stats.missingClocks}
          icon={AlertTriangle}
        />
        <StatCard
          title="Recent Batches"
          value={stats.recentBatches.length}
          icon={DollarSign}
        />
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Recent Attendance</h2>
        {stats.recentAttendance.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentAttendance.map((record, i) => (
                <TableRow key={i}>
                  <TableCell>{record.employeeName || 'N/A'}</TableCell>
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>{record.clockIn || '-'}</TableCell>
                  <TableCell>{record.clockOut || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-gray-400">No recent attendance records</p>
        )}
      </div>
    </div>
  );
}
