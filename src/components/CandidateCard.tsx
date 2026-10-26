'use client';

import React from 'react';
import { Candidate, CandidateStatus } from '@/types/database';
import { SparklesIcon } from './icons';

interface CandidateCardProps {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  onMoveStatus: (candidateId: string, nextStatus: CandidateStatus) => void;
}

const STAGE_ORDER: CandidateStatus[] = ['applied', 'screening', 'interview', 'rejected'];

export default function CandidateCard({
  candidate,
  onSelect,
  onMoveStatus,
}: CandidateCardProps) {
  const skills = Array.isArray(candidate.skills_json)
    ? (candidate.skills_json as string[])
    : [];

  const matchPercent =
    typeof candidate.similarity === 'number'
      ? Math.max(0, Math.min(100, Math.round(candidate.similarity * 100)))
      : null;

  const currentIdx = STAGE_ORDER.indexOf(candidate.status);
  const nextStage = currentIdx < 2 ? STAGE_ORDER[currentIdx + 1] : null;

  return (
    <div
      onClick={() => onSelect(candidate)}
      className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/40 rounded-xl p-4 cursor-pointer transition-all duration-200"
    >
      {/* Header: Name & Match Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-sm text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
          {candidate.name}
        </h4>

        {matchPercent !== null && (
          <span
            className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              matchPercent >= 75
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : matchPercent >= 50
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            <SparklesIcon className="w-3 h-3" />
            {matchPercent}%
          </span>
        )}
      </div>

      {/* Contact snippet */}
      {(candidate.email || candidate.phone) && (
        <div className="text-[11px] text-zinc-400 truncate mb-3">
          {candidate.email || candidate.phone}
        </div>
      )}

      {/* Skills pills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skills.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-zinc-950 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded-md truncate max-w-[120px]"
            >
              {skill}
            </span>
          ))}
          {skills.length > 3 && (
            <span className="text-[10px] bg-zinc-950 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded-md">
              +{skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer / Quick Move */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="text-zinc-500">
          {new Date(candidate.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>

        {nextStage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveStatus(candidate.id, nextStage);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded hover:bg-indigo-500/10 transition"
          >
            Advance &rarr;
          </button>
        )}
      </div>
    </div>
  );
}

