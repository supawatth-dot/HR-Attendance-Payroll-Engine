'use client';

import * as React from 'react';
import { Languages } from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

const options = [
  { value: 'en', label: 'EN' },
  { value: 'th', label: 'TH' },
] as const;

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-950/80 p-1 shadow-lg shadow-black/10',
        className
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500">
        <Languages size={14} />
      </div>
      {options.map((option) => {
        const active = locale === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              active
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
