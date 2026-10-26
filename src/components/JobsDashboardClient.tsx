'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BriefcaseIcon, ClockIcon, PlusIcon, SearchIcon, SparklesIcon, UsersIcon } from './icons';
import CreateJobModal from './CreateJobModal';
import { Job } from '@/types/database';

interface JobWithStats extends Job {
  candidateCount: number;
  stageCounts: {
    applied: number;
    screening: number;
    interview: number;
    rejected: number;
  };
}

interface JobsDashboardClientProps {
  initialJobs: JobWithStats[];
}

export default function JobsDashboardClient({ initialJobs }: JobsDashboardClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredJobs = initialJobs.filter((job) =>
    job.title.toLowerCase().includes(search.toLowerCase()) ||
    (job.description && job.description.toLowerCase().includes(search.toLowerCase())) ||
    (job.requirements && job.requirements.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Active Job Openings</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your open positions, view AI-parsed candidate pipelines, and rank candidates by semantic match.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition shadow-sm shadow-indigo-600/30 shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create New Job</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job title or keywords..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        <div className="text-xs text-zinc-500">
          Showing <span className="font-semibold text-zinc-300">{filteredJobs.length}</span> positions
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="mt-12 text-center py-16 px-4 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl">
          <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-3">
            <BriefcaseIcon className="w-6 h-6" />
          </div>
          <h3 className="font-medium text-zinc-200">No job openings found</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
            {search ? 'Try adjusting your search criteria.' : 'Get started by creating your first job opening to build your recruitment pipeline.'}
          </p>
          {!search && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Job</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => {
            const dateStr = new Date(job.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group relative flex flex-col justify-between bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {job.title}
                    </h2>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-800/70 px-2 py-0.5 rounded-full">
                      <ClockIcon className="w-3 h-3 text-zinc-400" />
                      {dateStr}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                    {job.description}
                  </p>

                  {job.requirements && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.requirements
                        .split(/[,\n]/)
                        .map((req) => req.trim())
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((tag, i) => (
                          <span
                            key={i}
                            className="text-[11px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-700/50 truncate max-w-[160px]"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <UsersIcon className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium text-zinc-200">{job.candidateCount}</span>
                    <span>{job.candidateCount === 1 ? 'candidate' : 'candidates'}</span>
                  </div>

                  <div className="flex items-center gap-1 text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">
                    <span>View Pipeline</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <CreateJobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

