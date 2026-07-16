'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { isAuthenticated } from '@/lib/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (!isAuthenticated() && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f] text-indigo-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium animate-pulse">Initializing HR Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0f] text-neutral-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
