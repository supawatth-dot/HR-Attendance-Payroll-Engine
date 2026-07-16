'use client';

import * as React from 'react';
import { Bell, User, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useLocale } from '@/lib/locale';

export function TopBar() {
  const pathname = usePathname();
  const { locale } = useLocale();

  const getPageTitle = () => {
    if (pathname.includes('/employees')) {
      return locale === 'th' ? 'รายชื่อพนักงาน' : 'Employee Directory';
    }
    if (pathname.includes('/attendance')) {
      return locale === 'th' ? 'ผลลัพธ์และบันทึกเวลาเข้างาน' : 'Attendance Records & Results';
    }
    if (pathname.includes('/import')) {
      return locale === 'th' ? 'นำเข้าข้อมูลจำนวนมาก (Excel/CSV/SAP)' : 'Bulk Data Import (Excel/CSV/SAP)';
    }
    if (pathname.includes('/rules')) {
      return locale === 'th' ? 'จัดการกฎและนโยบายแบบไดนามิก' : 'Dynamic Rule Engine & Policy Management';
    }
    if (pathname.includes('/payroll')) {
      return locale === 'th' ? 'คำนวณเงินเดือนและส่งออกหลายรูปแบบ' : 'Payroll Calculation & Multi-Format Export';
    }
    if (pathname.includes('/audit')) {
      return locale === 'th' ? 'ประวัติการตรวจสอบแบบเปลี่ยนแปลงไม่ได้' : 'Enterprise Immutable Audit Trail';
    }
    return locale === 'th' ? 'แดชบอร์ดภาพรวมผู้บริหาร' : 'Executive Overview Dashboard';
  };

  return (
    <header className="h-16 border-b border-neutral-800/80 bg-neutral-950/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
          {getPageTitle()}
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={12} /> {locale === 'th' ? 'เอนจินขับเคลื่อนด้วยกฎ' : 'Rule-Driven Engine'}
          </span>
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        <LanguageSwitcher />

        <button className="p-2 rounded-full hover:bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
        </button>

        <div className="flex items-center space-x-3 pl-3 border-l border-neutral-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm shadow">
            <User size={16} />
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold text-neutral-200">
              {locale === 'th' ? 'ผู้ดูแลระบบ' : 'System Administrator'}
            </div>
            <div className="text-[10px] text-indigo-400 font-medium">
              {locale === 'th' ? 'นโยบายองค์กร 2026' : 'Enterprise Policy 2026'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
