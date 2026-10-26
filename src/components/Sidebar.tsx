'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BriefcaseIcon, SparklesIcon } from './icons';

function SidebarNavLinks() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Jobs Dashboard',
      href: '/jobs',
      icon: BriefcaseIcon,
      active: pathname === '/jobs' || pathname.startsWith('/jobs/'),
    },
  ];

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              item.active
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-950 text-zinc-200 border-r border-zinc-800/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-sm">
          α
        </div>
        <div>
          <div className="font-semibold text-white tracking-tight flex items-center gap-1.5">
            Alpha ATS
            <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
              AI
            </span>
          </div>
          <div className="text-xs text-zinc-400">Smart Hiring Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
          Recruitment
        </div>
        <Suspense fallback={<div className="h-10 bg-zinc-900 rounded-lg animate-pulse" />}>
          <SidebarNavLinks />
        </Suspense>
      </nav>

      {/* AI Features & Status Footer */}
      <div className="p-4 border-t border-zinc-800/80">
        <div className="bg-zinc-900/80 rounded-lg p-3.5 border border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
            <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>OpenAI Pipeline</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Automatic resume parsing & pgvector semantic matching enabled.
          </p>
        </div>
      </div>
    </aside>
  );
}

