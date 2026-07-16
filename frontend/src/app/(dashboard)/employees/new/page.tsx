'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function NewEmployeePage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    departmentId: 1,
    shiftId: 1,
    hireDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    Promise.all([api.get('/departments'), api.get('/shifts')])
      .then(([deptRes, shiftRes]) => {
        setDepartments(deptRes.data || []);
        setShifts(shiftRes.data || []);
        if (deptRes.data?.length > 0) setFormData((prev) => ({ ...prev, departmentId: deptRes.data[0].id }));
        if (shiftRes.data?.length > 0) setFormData((prev) => ({ ...prev, shiftId: shiftRes.data[0].id }));
      })
      .catch((e) => console.error(e));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/employees', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        departmentId: Number(formData.departmentId),
        shiftId: Number(formData.shiftId),
        hireDate: formData.hireDate,
      });
      router.push('/employees');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed creating employee. Ensure all fields are filled.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Employee Directory
        </Link>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <UserPlus size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Enroll New Employee</h2>
            <p className="text-xs text-neutral-400">Assigned shift and department determine rule engine overrides</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                First Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Somchai"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                Last Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Jaidee"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                Department
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) })}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
              >
                {departments.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                Assigned Shift
              </label>
              <select
                value={formData.shiftId}
                onChange={(e) => setFormData({ ...formData, shiftId: Number(e.target.value) })}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
              >
                {shifts.map((shift: any) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.startTime} - {shift.endTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
              Hire Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.hireDate}
              onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
            <Link
              href="/employees"
              className="rounded-lg border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              <span>Enroll Employee</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
