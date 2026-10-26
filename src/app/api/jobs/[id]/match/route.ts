import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/openai';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const supabase = getSupabaseClient();

    // 1. Fetch the job details and embedding
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    let jobEmbedding = job.embedding;

    // Fallback: If job embedding was not generated yet, compute and store it now
    if (!jobEmbedding || (Array.isArray(jobEmbedding) && jobEmbedding.length === 0)) {
      const textToEmbed = job.requirements
        ? `Job Title: ${job.title}\n\nDescription:\n${job.description}\n\nRequirements:\n${job.requirements}`
        : `Job Title: ${job.title}\n\nDescription:\n${job.description}`;

      jobEmbedding = await generateEmbedding(textToEmbed);

      await supabase
        .from('jobs')
        .update({ embedding: jobEmbedding })
        .eq('id', jobId);
    }

    // 2. Call match_candidates RPC function
    const { data: rankedCandidates, error: matchError } = await supabase.rpc(
      'match_candidates',
      {
        query_embedding: jobEmbedding,
        filter_job_id: jobId,
        match_threshold: -1.0,
        match_count: 100,
      }
    );

    if (matchError) {
      return NextResponse.json(
        { error: `Matching RPC error: ${matchError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      candidates: rankedCandidates || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

