'use client';

import React, { useState } from 'react';
import { Candidate, CandidateStatus } from '@/types/database';
import { CheckCircleIcon, SparklesIcon, UsersIcon, XIcon } from './icons';

interface CandidateModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onStatusChange: (candidateId: string, newStatus: CandidateStatus) => void;
}

const STAGES: { id: CandidateStatus; label: string }[] = [
  { id: 'applied', label: 'Applied' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Interview' },
  { id: 'rejected', label: 'Rejected' },
];

export default function CandidateModal({
  candidate,
  onClose,
  onStatusChange,
}: CandidateModalProps) {
  const [showRawResume, setShowRawResume] = useState(false);

  if (!candidate) return null;

  // Safe parsing of JSON attributes
  const skills: string[] = Array.isArray(candidate.skills_json)
    ? (candidate.skills_json as string[])
    : [];

  const experience: Array<{ company?: string; role?: string; duration?: string; summary?: string }> =
    Array.isArray(candidate.experience_json)
      ? (candidate.experience_json as Array<{ company?: string; role?: string; duration?: string; summary?: string }>)
      : [];

  const matchPercent =
    typeof candidate.similarity === 'number'
      ? Math.max(0, Math.min(100, Math.round(candidate.similarity * 100)))
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between gap-4 bg-zinc-900/90">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-zinc-100">{candidate.name}</h2>
              {matchPercent !== null && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    matchPercent >= 75
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : matchPercent >= 50
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  {matchPercent}% Match
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-400">
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="hover:text-indigo-400 transition"
                >
                  {candidate.email}
                </a>
              )}
              {candidate.email && candidate.phone && <span>•</span>}
              {candidate.phone && <span>{candidate.phone}</span>}
              <span>•</span>
              <span>
                Added {new Date(candidate.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Stage Bar */}
        <div className="px-6 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto">
          <span className="text-xs font-medium text-zinc-400 shrink-0">Stage:</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => onStatusChange(candidate.id, s.id)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition ${
                  candidate.status === s.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Extracted Skills & Technologies
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, i) => (
                  <span
                    key={i}
                    className="text-xs bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 px-2.5 py-1 rounded-lg"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {experience.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Work Experience
              </h3>
              <div className="space-y-3">
                {experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-zinc-200">
                        {exp.role || 'Role'}
                      </span>
                      {exp.duration && (
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {exp.duration}
                        </span>
                      )}
                    </div>
                    {exp.company && (
                      <div className="text-xs text-indigo-400 font-medium mt-0.5">
                        {exp.company}
                      </div>
                    )}
                    {exp.summary && (
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {exp.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Raw Text */}
          {candidate.raw_resume_text && (
            <div className="pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowRawResume(!showRawResume)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition"
              >
                <span>{showRawResume ? 'Hide' : 'View'} Raw Extracted Resume Text</span>
                <span>{showRawResume ? '▲' : '▼'}</span>
              </button>

              {showRawResume && (
                <div className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                  {candidate.raw_resume_text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

