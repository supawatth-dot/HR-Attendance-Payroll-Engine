import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'HR Attendance & Payroll Engine | Enterprise Edition',
  description: 'Rule-Driven Production-Ready HR & Attendance Engine with Dynamic DB-backed Policy Versions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#0a0a0f] text-neutral-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
