'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Clock, Filter, Play, CheckCircle2, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatDuration } from '@/lib/utils';

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMissing, setFilterMissing] = useState(false);
  const [filterAbsent, setFilterAbsent] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params: any = { startDate, endDate, pageSize: 100 };
      if (filterMissing) params.missingClock = 'true';
      if (filterAbsent) params.isAbsent = 'true';

      const res = await api.get('/attendance/results', { params });
      setRecords(res.data?.data || []);
    } catch (e) {
      console.error('Failed fetching attendance results', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [startDate, endDate, filterMissing, filterAbsent]);

  const handleRunEngine = async () => {
    try {
      setRunning(true);
      setMessage(null);
      await api.post('/attendance/run', { startDate, endDate });
      setMessage(`Triggered attendance recalculation engine from ${startDate} to ${endDate}`);
      await fetchRecords();
    } catch (e: any) {
      setMessage(`Engine error: ${e.response?.data?.message || e.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Clock className="text-indigo-400" /> Attendance Engine Results
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Review calculated working hours, late minutes, meal allowances (`25 THB`), and overtime multipliers
          </p>
        </div>

        <button
          onClick={handleRunEngine}
          disabled={running}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 self-start md:self-auto"
        >
          {running ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Play size={16} className="fill-white" />
          )}
          <span>Recalculate Selected Range</span>
        </button>
      </div>

      {message && (
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-3.5 text-xs text-indigo-300 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <Calendar size={14} className="text-indigo-400" />
            <span>Start:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <span>End:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFilterMissing(!filterMissing); if (!filterMissing) setFilterAbsent(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filterMissing
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:text-white'
            }`}
          >
            <AlertTriangle size={14} /> Only Missing Clocks
          </button>

          <button
            onClick={() => { setFilterAbsent(!filterAbsent); if (!filterAbsent) setFilterMissing(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filterAbsent
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:text-white'
            }`}
          >
            Only Absent
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Working Hrs</TableHead>
              <TableHead>Late (Mins)</TableHead>
              <TableHead>OT (Hrs)</TableHead>
              <TableHead>Meal Allow.</TableHead>
              <TableHead>Diligence Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-neutral-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-indigo-400" />
                    <span>Executing calculations across DB rule policies...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-neutral-500">
                  No attendance records found for the selected filter range.
                </TableCell>
              </TableRow>
            ) : (
              records.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-mono text-xs text-neutral-300">
                    {formatDate(rec.date)}
                  </TableCell>
                  <TableCell className="font-semibold text-white">
                    {rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : `Emp #${rec.employeeId}`}
                  </TableCell>
                  <TableCell>
                    {rec.isAbsent ? (
                      <Badge variant="destructive">Absent</Badge>
                    ) : rec.missingClock ? (
                      <Badge variant="warning">Missing Clock</Badge>
                    ) : (
                      <Badge variant="success">Present</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-indigo-300">
                    {formatDuration(rec.workingSeconds)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {rec.lateSeconds > 0 ? (
                      <span className="text-amber-400 font-semibold">{Math.floor(rec.lateSeconds / 60)} m</span>
                    ) : (
                      <span className="text-neutral-500">0 m</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-purple-300">
                    {formatDuration(rec.otSeconds)}
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-400">
                    {formatCurrency(rec.mealAllowanceAmount)}
                  </TableCell>
                  <TableCell>
                    {rec.lateSeconds > 15 * 60 || rec.isAbsent ? (
                      <Badge variant="destructive">Forfeited</Badge>
                    ) : (
                      <Badge variant="success">Eligible</Badge>
                    )}
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
