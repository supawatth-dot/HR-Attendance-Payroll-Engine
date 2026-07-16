'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  Upload,
  Settings,
  DollarSign,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearToken } from '@/lib/auth';
import { useLocale } from '@/lib/locale';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const { locale } = useLocale();

  const navItems = [
    { href: '/dashboard', label: locale === 'th' ? 'แดชบอร์ด' : 'Dashboard', icon: LayoutDashboard },
    { href: '/employees', label: locale === 'th' ? 'พนักงาน' : 'Employees', icon: Users },
    { href: '/attendance', label: locale === 'th' ? 'เวลาเข้างาน' : 'Attendance', icon: Clock },
    { href: '/import', label: locale === 'th' ? 'นำเข้าข้อมูล' : 'Import Data', icon: Upload },
    { href: '/rules', label: locale === 'th' ? 'กฎการคำนวณ' : 'Rule Engine', icon: Settings },
    { href: '/payroll', label: locale === 'th' ? 'ส่งออกเงินเดือน' : 'Payroll Export', icon: DollarSign },
    { href: '/audit', label: locale === 'th' ? 'บันทึกตรวจสอบ' : 'Audit Logs', icon: FileText },
  ];

  const handleLogout = () => {
    clearToken();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl transition-all duration-300 relative z-20',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-neutral-800/80">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
              HR
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-neutral-100 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
              Engine 2.0
            </span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 mx-auto rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
            HR
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-white border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                  : 'text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-200'
              )}
            >
              <Icon
                size={20}
                className={cn(
                  'transition-colors flex-shrink-0',
                  isActive ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-300'
                )}
              />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-neutral-800/80">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span>{locale === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>}
        </button>
      </div>
    </aside>
  );
}
