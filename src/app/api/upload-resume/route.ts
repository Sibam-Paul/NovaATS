import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import OpenAI from 'openai';
import { getSupabaseClient } from '@/lib/supabase';
import { ParsedResume } from '@/lib/openai';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured in environment variables.');
  }
  return new OpenAI({ apiKey });
}

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

    // 1. Extract raw text from the uploaded PDF document using pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdf(buffer);
    const rawText = pdfData.text ? pdfData.text.trim() : '';

    if (!rawText || rawText.length === 0) {
      return NextResponse.json(
        {
          error:
            'Could not extract text from the PDF. The file may be empty, password-protected, or a scanned image without selectable text.',
        },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    // 2. Structured Extraction using OpenAI gpt-4o-mini with response_format: { type: "json_object" }
    const systemInstruction = `You are an expert ATS (Applicant Tracking System) resume extraction engine.
Analyze the provided resume text thoroughly and extract candidate data into a strict JSON object.
You MUST output ONLY a valid JSON object matching the following schema:

{
  "name": "Candidate Full Name",
  "email": "candidate.email@example.com (or null if not found)",
  "phone": "+1 234 567 8900 (or null if not found)",
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "Dates/Duration (e.g. Jan 2022 - Present)",
      "summary": "Key achievements and responsibilities"
    }
  ],
  "summary": "A concise professional summary highlighting the candidate's core domain expertise, years of experience, and primary strengths."
}

Strict requirements:
1. "name": Extract the candidate's actual name. If undetectable, output "Unknown Candidate".
2. "email" & "phone": Must be strings or null if absent.
3. "skills": An array of technical and professional skills (languages, frameworks, tools, methodologies).
4. "experience": An array of structured prior employment entries.
5. "summary": A concise narrative summary of the candidate's profile.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Extract the following resume text:\n\n${rawText}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const rawJson = completion.choices[0]?.message?.content;
    if (!rawJson) {
      throw new Error('Received empty response from OpenAI gpt-4o-mini.');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawJson);
    } catch (err) {
      throw new Error(
        `Failed to parse OpenAI output as JSON: ${err instanceof Error ? err.message : String(err)}\nRaw output: ${rawJson}`
      );
    }

    const parsedResume: ParsedResume = {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Unknown Candidate',
      email: typeof parsed.email === 'string' && parsed.email.trim() ? parsed.email.trim() : null,
      phone: typeof parsed.phone === 'string' && parsed.phone.trim() ? parsed.phone.trim() : null,
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.filter((s): s is string => typeof s === 'string')
        : [],
      experience: Array.isArray(parsed.experience)
        ? (parsed.experience as ParsedResume['experience'])
        : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    };

    // 3. Build a structured summary of the candidate for semantic embedding
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

    // 4. Generate 768-dim vector embedding using OpenAI text-embedding-3-small
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: structuredSummary,
      dimensions: 768, // Explicitly locked to 768 dimensions for Supabase vector(768)
    });

    const embedding = embeddingResponse.data[0]?.embedding;
    if (!embedding || embedding.length !== 768) {
      throw new Error(`OpenAI embedding failed or returned invalid dimension: ${embedding?.length}`);
    }

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
