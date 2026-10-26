import { Suspense } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import JobsDashboardClient from '@/components/JobsDashboardClient';
import { CandidateStatus } from '@/types/database';
import { Spinner } from '@/components/icons';

async function JobsList() {
  const supabase = getSupabaseClient();

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, job_id, status');

  if (jobsError) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          Failed to load jobs from database: {jobsError.message}
        </div>
      </div>
    );
  }

  const jobsWithStats = (jobs || []).map((job) => {
    const jobCandidates = (candidates || []).filter((c) => c.job_id === job.id);
    const stageCounts: Record<CandidateStatus, number> = {
      applied: 0,
      screening: 0,
      interview: 0,
      rejected: 0,
    };

    jobCandidates.forEach((c) => {
      const statusKey = c.status as CandidateStatus;
      if (statusKey in stageCounts) {
        stageCounts[statusKey]++;
      }
    });

    return {
      ...job,
      candidateCount: jobCandidates.length,
      stageCounts,
    };
  });

  return <JobsDashboardClient initialJobs={jobsWithStats} />;
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] gap-3 text-zinc-400">
          <Spinner className="w-8 h-8 text-indigo-500" />
          <p className="text-sm">Loading jobs dashboard...</p>
        </div>
      }
    >
      <JobsList />
    </Suspense>
  );
}

