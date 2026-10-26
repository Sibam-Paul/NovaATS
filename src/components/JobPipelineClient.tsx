'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Job, Candidate, CandidateStatus } from '@/types/database';
import { ArrowLeftIcon, BriefcaseIcon, CheckCircleIcon, SparklesIcon, Spinner, TrendingUpIcon, UsersIcon } from './icons';
import ResumeDropzone from './ResumeDropzone';
import CandidateCard from './CandidateCard';
import CandidateModal from './CandidateModal';

interface JobPipelineClientProps {
  job: Job;
  initialCandidates: Candidate[];
}

interface ColumnConfig {
  id: CandidateStatus;
  title: string;
  badgeBg: string;
  dotColor: string;
}

const COLUMNS: ColumnConfig[] = [
  { id: 'applied', title: 'Applied', badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dotColor: 'bg-blue-400' },
  { id: 'screening', title: 'Screening', badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dotColor: 'bg-amber-400' },
  { id: 'interview', title: 'Interview', badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dotColor: 'bg-purple-400' },
  { id: 'rejected', title: 'Rejected', badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dotColor: 'bg-rose-400' },
];

export default function JobPipelineClient({ job, initialCandidates }: JobPipelineClientProps) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isRanking, setIsRanking] = useState(false);
  const [isRanked, setIsRanked] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'leaderboard'>('kanban');

  // 1. Add candidate after PDF upload
  function handleCandidateAdded(newCandidate: Candidate) {
    setCandidates((prev) => [newCandidate, ...prev]);
  }

  // 2. Optimistic status update
  async function handleStatusChange(candidateId: string, newStatus: CandidateStatus) {
    // Update local state immediately
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    );

    if (selectedCandidate && selectedCandidate.id === candidateId) {
      setSelectedCandidate((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    // Persist to backend
    try {
      await fetch(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update candidate status:', err);
    }
  }

  // 3. AI Ranking via Supabase match_candidates RPC
  async function handleRankByFit() {
    setIsRanking(true);
    setRankError(null);

    try {
      const res = await fetch(`/api/jobs/${job.id}/match`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to rank candidates');
      }

      const rankedResults: Candidate[] = data.candidates || [];

      // Merge similarity scores into candidates list and sort
      setCandidates((prev) => {
        const similarityMap = new Map<string, number>();
        rankedResults.forEach((r) => {
          if (typeof r.similarity === 'number') {
            similarityMap.set(r.id, r.similarity);
          }
        });

        const updated = prev.map((c) => ({
          ...c,
          similarity: similarityMap.get(c.id) ?? c.similarity ?? 0,
        }));

        // Sort descending by similarity
        return updated.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
      });

      setIsRanked(true);
    } catch (err) {
      setRankError(err instanceof Error ? err.message : 'Ranking failed');
    } finally {
      setIsRanking(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Breadcrumb & Job Header */}
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-indigo-400 transition mb-3"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>Back to Jobs Dashboard</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">{job.title}</h1>
              <span className="text-xs text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-1 rounded-full">
                {candidates.length} {candidates.length === 1 ? 'Candidate' : 'Candidates'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl line-clamp-2 leading-relaxed">
              {job.description}
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-1 flex items-center text-xs">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  viewMode === 'kanban'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('leaderboard')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  viewMode === 'leaderboard'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Leaderboard
              </button>
            </div>

            {/* AI Rank by Fit Button */}
            <button
              onClick={handleRankByFit}
              disabled={isRanking || candidates.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shadow-lg ${
                isRanked
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30'
              } disabled:opacity-50`}
            >
              {isRanking ? (
                <>
                  <Spinner className="w-4 h-4 text-white" />
                  <span>Computing Semantic Matches...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  <span>{isRanked ? 'Re-Rank by Fit' : 'Rank by Fit'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Ranking Error notification */}
      {rankError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center justify-between">
          <span>Failed to rank candidates: {rankError}</span>
          <button onClick={() => setRankError(null)} className="font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Zone at the Top */}
      <section className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Resume Ingestion Pipeline
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">gpt-4o-mini + pgvector</span>
        </div>
        <ResumeDropzone jobId={job.id} onCandidateAdded={handleCandidateAdded} />
      </section>

      {/* Main Candidate Board / Leaderboard */}
      {viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {COLUMNS.map((col) => {
            const colCandidates = candidates.filter((c) => c.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-4 flex flex-col min-h-[420px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <h3 className="font-semibold text-sm text-zinc-200">{col.title}</h3>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${col.badgeBg}`}>
                    {colCandidates.length}
                  </span>
                </div>

                {/* Candidate Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[680px] pr-0.5">
                  {colCandidates.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-center text-zinc-600 border border-dashed border-zinc-800/60 rounded-xl p-4">
                      <p className="text-xs">No candidates in {col.title.toLowerCase()}</p>
                    </div>
                  ) : (
                    colCandidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        onSelect={setSelectedCandidate}
                        onMoveStatus={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Ranked Fit Leaderboard View */
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4 text-indigo-400" />
              Candidate Fit Leaderboard (Sorted by Semantic Similarity)
            </h3>
            <span className="text-xs text-zinc-500">
              {candidates.length} total candidates
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Match Fit</th>
                  <th className="py-3 px-4">Skills</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {candidates.map((c, index) => {
                  const match =
                    typeof c.similarity === 'number'
                      ? Math.round(c.similarity * 100)
                      : null;
                  const skills = Array.isArray(c.skills_json) ? (c.skills_json as string[]) : [];

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCandidate(c)}
                      className="hover:bg-zinc-900/50 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-400">
                        #{index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-100">{c.name}</div>
                        <div className="text-[11px] text-zinc-500">{c.email || c.phone || 'No contact info'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {match !== null ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full border text-[11px] ${
                                match >= 75
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : match >= 50
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              <SparklesIcon className="w-3 h-3" />
                              {match}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">Not ranked yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {skills.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded"
                            >
                              {s}
                            </span>
                          ))}
                          {skills.length > 3 && (
                            <span className="text-[10px] text-zinc-500">+{skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-zinc-300 font-medium">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCandidate(c);
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          View Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      <CandidateModal
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

