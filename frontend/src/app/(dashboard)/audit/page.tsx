'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ShieldCheck, FileText, Search, RefreshCw, Database } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableName, setTableName] = useState('');

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
            <ShieldCheck className="text-indigo-400" /> Enterprise Immutable Audit Trail
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Complete compliance logging for all employee enrollments, rule policy version changes, and payroll calculations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Filter by table name..."
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
              <TableHead>Timestamp</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Changed By (User ID)</TableHead>
              <TableHead>Reason / Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-indigo-400" />
                    <span>Querying secure audit trail from PostgreSQL...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
                  No audit events recorded yet for the specified filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-neutral-400">
                    {formatDate(log.timestamp)}
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
                      {log.operation}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-300">
                    Admin User #{log.changedBy}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-400">
                    {log.reason || 'Standard system action via dashboard/API'}
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
