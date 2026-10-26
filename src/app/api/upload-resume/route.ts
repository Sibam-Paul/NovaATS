import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { extractTextFromPdf } from '@/lib/pdf';
import { generateEmbedding, parseResumeWithGemini } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const jobId = formData.get('job_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file uploaded. Please provide a "file" field in the form data.' },
        { status: 400 }
      );
    }

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'A valid "job_id" is required to link the candidate to a job.' },
        { status: 400 }
      );
    }

    // Validate that the uploaded file is a PDF
    const fileName = file.name || '';
    if (!fileName.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF files are supported.' },
        { status: 400 }
      );
    }

    // 1. Extract raw text from the PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rawText = await extractTextFromPdf(buffer);

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            'Could not extract text from the PDF. The file may be empty, password-protected, or a scanned image without selectable text.',
        },
        { status: 400 }
      );
    }

    // 2. Pass the raw text to Gemini 1.5 Flash with strict system prompt to output structured JSON
    const parsedResume = await parseResumeWithGemini(rawText);

    // 3. Build a structured summary of the candidate to pass to the embedding model
    const summaryParts: string[] = [
      `Candidate Name: ${parsedResume.name}`,
    ];

    if (parsedResume.summary) {
      summaryParts.push(`Professional Summary: ${parsedResume.summary}`);
    }

    if (parsedResume.skills && parsedResume.skills.length > 0) {
      summaryParts.push(`Technical & Professional Skills: ${parsedResume.skills.join(', ')}`);
    }

    if (parsedResume.experience && parsedResume.experience.length > 0) {
      const expDetails = parsedResume.experience
        .map(
          (exp) =>
            `- ${exp.role || 'Role'} at ${exp.company || 'Company'} (${exp.duration || 'Duration'}): ${exp.summary || ''}`
        )
        .join('\n');
      summaryParts.push(`Work Experience:\n${expDetails}`);
    }

    const structuredSummary = summaryParts.join('\n\n');

    // 4. Pass that structured summary to the Gemini embedding model (text-embedding-004)
    const embedding = await generateEmbedding(structuredSummary);

    // 5. Save parsed JSON, raw text, and vector embedding into candidates table in Supabase
    const supabase = getSupabaseClient();
    const { data: candidate, error: insertError } = await supabase
      .from('candidates')
      .insert({
        job_id: jobId,
        name: parsedResume.name,
        email: parsedResume.email,
        phone: parsedResume.phone,
        skills_json: parsedResume.skills,
        experience_json: parsedResume.experience as unknown as import('@/types/database').Json,
        raw_resume_text: rawText,
        embedding,
        status: 'applied',
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
        message: 'Resume processed and candidate added successfully',
        candidate,
        parsed: parsedResume,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred during resume processing',
      },
      { status: 500 }
    );
  }
}
