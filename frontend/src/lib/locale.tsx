'use client';

import * as React from 'react';

export type Locale = 'en' | 'th';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const STORAGE_KEY = 'hr-engine-locale';

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<Locale>('en');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedLocale = window.localStorage.getItem(STORAGE_KEY);
    if (savedLocale === 'en' || savedLocale === 'th') {
      setLocale(savedLocale);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = React.useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }

  return context;
}

export function useLocaleText() {
  const { locale } = useLocale();

  return (en: string, th: string) => (locale === 'th' ? th : en);
}

export function getDateLocale(locale: Locale) {
  return locale === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB';
}
