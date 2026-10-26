import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSupabaseClient } from '@/lib/supabase';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured in environment variables.');
  }
  return new OpenAI({ apiKey });
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, requirements } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Job title is required' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    // Build context-rich text for vector embedding
    const textToEmbed = requirements && typeof requirements === 'string' && requirements.trim()
      ? `Job Title: ${title.trim()}\n\nDescription:\n${description.trim()}\n\nRequirements:\n${requirements.trim()}`
      : `Job Title: ${title.trim()}\n\nDescription:\n${description.trim()}`;

    // 1. Generate 768-dimensional embedding using OpenAI text-embedding-3-small
    const openai = getOpenAIClient();
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
      dimensions: 768, // Strictly locked to 768 dimensions for Supabase vector(768)
    });

    const embedding = embeddingResponse.data[0]?.embedding;
    if (!embedding || embedding.length !== 768) {
      throw new Error(`Failed to generate 768-dim embedding: received ${embedding?.length} dimensions.`);
    }

    // 2. Insert row into Supabase
    const supabase = getSupabaseClient();
    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        title: title.trim(),
        description: description.trim(),
        requirements: requirements && typeof requirements === 'string' && requirements.trim() ? requirements.trim() : null,
        embedding,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Database insertion error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Job created successfully',
        job,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
