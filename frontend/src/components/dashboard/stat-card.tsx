import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  gradient?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendType = 'neutral',
  icon: Icon,
  gradient = 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-neutral-900/60 p-5 backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 group',
        gradient
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{title}</span>
        <div className="p-2.5 rounded-lg bg-neutral-800/80 text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition-colors">
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-3xl font-extrabold text-neutral-100 tracking-tight">{value}</div>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full border',
              trendType === 'positive' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              trendType === 'negative' && 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              trendType === 'neutral' && 'bg-neutral-800 text-neutral-300 border-neutral-700'
            )}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && <div className="mt-1 text-xs text-neutral-400 font-medium">{subtitle}</div>}
    </div>
  );
}
