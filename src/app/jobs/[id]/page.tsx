import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import JobPipelineClient from '@/components/JobPipelineClient';
import { Candidate, Job } from '@/types/database';
import { Spinner } from '@/components/icons';

async function JobPipelineLoader({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;
  const supabase = getSupabaseClient();

  // 1. Fetch Job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (jobError || !job) {
    notFound();
  }

  // 2. Fetch Candidates for this job
  const { data: candidates, error: candidatesError } = await supabase
    .from('candidates')
    .select('*')
    .eq('job_id', id)
    .order('created_at', { ascending: false });

  if (candidatesError) {
    console.error('Error fetching candidates:', candidatesError);
  }

  return (
    <JobPipelineClient
      job={job as Job}
      initialCandidates={(candidates as unknown as Candidate[]) || []}
    />
  );
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] gap-3 text-zinc-400">
          <Spinner className="w-8 h-8 text-indigo-500" />
          <p className="text-sm">Loading recruitment pipeline...</p>
        </div>
      }
    >
      <JobPipelineLoader paramsPromise={params} />
    </Suspense>
  );
}

