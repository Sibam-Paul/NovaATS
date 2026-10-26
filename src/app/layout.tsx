import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Alpha ATS - AI-Powered Applicant Tracking System',
  description: 'AI-enabled Applicant Tracking System with OpenAI resume parsing and semantic vector ranking',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex bg-zinc-950 text-zinc-100 font-sans antialiased">
        <Suspense fallback={<aside className="w-64 bg-zinc-950 border-r border-zinc-800 min-h-screen shrink-0" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-zinc-900/60">
          {children}
        </main>
      </body>
    </html>
  );
}
