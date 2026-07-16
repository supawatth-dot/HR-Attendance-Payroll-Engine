'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { DollarSign, Download, Play, CheckCircle2, FileSpreadsheet, FileText, Calendar, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PayrollPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [periodStart, setPeriodStart] = useState('2026-01-01');
  const [periodEnd, setPeriodEnd] = useState('2026-01-31');
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage(`Successfully computed payroll batch for ${periodStart} to ${periodEnd}`);
      await fetchBatches();
    } catch (e: any) {
      setMessage(`Error generating payroll: ${e.response?.data?.message || e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = (batchId: number, format: 'xlsx' | 'csv' | 'pdf') => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/payroll/batches/${batchId}/export?format=${format}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <DollarSign className="text-emerald-400" /> Payroll Generation & Export Hub
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Aggregates attendance working hours, overtime pay, diligence bonuses, and meal allowances into finalized pay runs.
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
            <span>Pay Period Start:</span>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <span>Pay Period End:</span>
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
          <span>Calculate & Finalize Batch</span>
        </button>
      </div>

      {/* Batches Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch ID</TableHead>
              <TableHead>Pay Period</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Employees / Items</TableHead>
              <TableHead className="text-right">Export Reports</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-emerald-400" />
                    <span>Loading payroll run history...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
                  No payroll batches generated yet. Select dates above and click `Calculate & Finalize Batch`.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-xs font-bold text-indigo-400">
                    BATCH #{batch.id}
                  </TableCell>
                  <TableCell className="font-semibold text-white">
                    {formatDate(batch.periodStart)} — {formatDate(batch.periodEnd)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-400">
                    {formatDate(batch.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">FINALIZED</Badge>
                  </TableCell>
                  <TableCell className="text-neutral-300 font-medium">
                    {batch._count?.items || 0} enrolled staff
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleExport(batch.id, 'xlsx')}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold transition-all"
                      >
                        <FileSpreadsheet size={14} /> Excel (.xlsx)
                      </button>
                      <button
                        onClick={() => handleExport(batch.id, 'csv')}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 text-xs font-semibold transition-all"
                      >
                        <Download size={14} /> CSV
                      </button>
                      <button
                        onClick={() => handleExport(batch.id, 'pdf')}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 text-xs font-semibold transition-all"
                      >
                        <FileText size={14} /> PDF Slip
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
