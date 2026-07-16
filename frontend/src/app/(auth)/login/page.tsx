'use client';

import * as React from 'react';
import { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useLocale } from '@/lib/locale';

export default function LoginPage() {
  const [username, setUsername] = useState('System');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locale } = useLocale();

  const tx = (en: string, th: string) => (locale === 'th' ? th : en);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('Submitting login form...');

    try {
      console.log('Making API request to /auth/login with:', { username, password });
      const res = await api.post('/auth/login', { username, password });
      console.log('API Response:', res.data);
      if (res.data?.access_token) {
        setToken(res.data.access_token);
        window.location.href = '/dashboard';
      } else {
        setError(tx('Login failed: Invalid server response', 'เข้าสู่ระบบไม่สำเร็จ: เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง'));
      }
    } catch (err: any) {
      console.log('API Error:', err);
      console.log('Error Response:', err.response);
      setError(
        err.response?.data?.message ||
          tx('Invalid username or password. Try username: System', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง ลองใช้ชื่อผู้ใช้: System')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f] px-4">
      {/* Animated gradient background blobs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-[128px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-600/20 blur-[128px] pointer-events-none animate-pulse" />

      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl glass-card p-8 border border-neutral-800/80 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/30">
            HR
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {tx('HR Engine Enterprise', 'HR Engine สำหรับองค์กร')}
          </h2>
          <p className="mt-1 text-xs text-neutral-400 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            {tx('100% Database-Driven Dynamic Rule Policies', 'นโยบายกฎแบบไดนามิกขับเคลื่อนด้วยฐานข้อมูล 100%')}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300 flex items-center gap-2">
            <span className="font-semibold">{tx('Error:', 'ข้อผิดพลาด:')}</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
              {tx('Username or Employee ID', 'ชื่อผู้ใช้หรือรหัสพนักงาน')}
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-3 text-neutral-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={tx("Enter 'System' or Employee ID", "กรอก 'System' หรือรหัสพนักงาน")}
                required
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 pl-10 pr-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
              {tx('Password', 'รหัสผ่าน')}
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3 text-neutral-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 pl-10 pr-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{tx('Authenticating...', 'กำลังตรวจสอบสิทธิ์...')}</span>
                </>
              ) : (
                <>
                  <span>{tx('Sign In to Dashboard', 'เข้าสู่แดชบอร์ด')}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-neutral-800/80 pt-4 text-center">
          <span className="text-[11px] text-neutral-500 font-medium">
            {tx('Production environment default setup: login with username ', 'ค่าตั้งต้นสำหรับสภาพแวดล้อมเดโม: เข้าระบบด้วยชื่อผู้ใช้ ')}
            <strong className="text-neutral-300">System</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
