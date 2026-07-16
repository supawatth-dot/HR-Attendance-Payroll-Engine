'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Users, CalendarOff, AlertTriangle, Timer, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getOverview, type OverviewResponse } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function OverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOverview()
      .then(setData)
      .catch((e) => setError(e?.message || 'Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-indigo-400 p-6">Loading overview…</div>;
  }
  if (error || !data) {
    return <div className="text-rose-400 p-6">Failed to load overview: {error}</div>;
  }

  const { kpis, byDepartment, trend, range } = data;
  const maxOt = Math.max(1, ...trend.map((t) => t.otHours));
  const maxLate = Math.max(1, ...trend.map((t) => t.lateCount));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">Overview</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Attendance &amp; payroll rollup for {range.startDate} → {range.endDate} · live from the database
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          title="Employees"
          value={kpis.employees}
          subtitle="Active workforce"
          icon={Users}
          gradient="from-blue-500/10 to-indigo-500/5 border-blue-500/20"
        />
        <StatCard
          title="Leave Days"
          value={kpis.leaveDays}
          subtitle="Approved leaves in period"
          icon={CalendarOff}
          gradient="from-sky-500/10 to-blue-500/5 border-sky-500/20"
        />
        <StatCard
          title="Late Instances"
          value={kpis.lateCount}
          subtitle={`${kpis.absentDays} absent day(s)`}
          trend={kpis.lateCount > 0 ? 'Monitor' : 'All on time'}
          trendType={kpis.lateCount > 0 ? 'negative' : 'positive'}
          icon={AlertTriangle}
          gradient="from-rose-500/10 to-orange-500/5 border-rose-500/20"
        />
        <StatCard
          title="Working Hours"
          value={kpis.workingHours.toLocaleString()}
          subtitle="Total net hours"
          icon={Timer}
          gradient="from-indigo-500/10 to-purple-500/5 border-indigo-500/20"
        />
        <StatCard
          title="Overtime Hours"
          value={kpis.otHours.toLocaleString()}
          subtitle="Beyond standard shift"
          trend="OT"
          trendType="neutral"
          icon={TrendingUp}
          gradient="from-amber-500/10 to-yellow-500/5 border-amber-500/20"
        />
        <StatCard
          title="Meal Allowance"
          value={formatCurrency(kpis.mealTotal)}
          subtitle="Total paid in period"
          icon={UtensilsCrossed}
          gradient="from-emerald-500/10 to-teal-500/5 border-emerald-500/20"
        />
      </div>

      {/* Daily trend (OT hours + late count) */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
        <div>
          <h3 className="text-base font-bold text-neutral-100">Daily Trend</h3>
          <p className="text-xs text-neutral-400">Bars = overtime hours · dots = late instances</p>
        </div>
        <div className="flex items-end gap-1 h-40">
          {trend.map((t) => (
            <div key={t.date} className="flex-1 h-full flex flex-col items-center justify-end group relative">
              <div
                className="w-full rounded-t bg-gradient-to-t from-amber-600/70 to-amber-400/70"
                style={{ height: `${(t.otHours / maxOt) * 100}%` }}
              />
              <div
                className="absolute -top-1 h-1.5 w-1.5 rounded-full bg-rose-400"
                style={{ bottom: `${(t.lateCount / maxLate) * 100}%` }}
              />
              <div className="pointer-events-none absolute bottom-full mb-6 hidden group-hover:block whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-[10px] text-neutral-200 border border-neutral-700 z-10">
                {t.date}: {t.otHours}h OT · {t.lateCount} late
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Department breakdown */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
        <h3 className="text-base font-bold text-neutral-100">By Department</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Working Hrs</TableHead>
                <TableHead>OT Hrs</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Meal (฿)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byDepartment.map((d) => (
                <TableRow key={d.department}>
                  <TableCell className="font-semibold text-neutral-200">{d.department}</TableCell>
                  <TableCell>{d.employees}</TableCell>
                  <TableCell>{d.workingHours.toLocaleString()}</TableCell>
                  <TableCell className="text-amber-400">{d.otHours.toLocaleString()}</TableCell>
                  <TableCell className="text-rose-400">{d.lateCount}</TableCell>
                  <TableCell className="text-emerald-400">{formatCurrency(d.mealTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
