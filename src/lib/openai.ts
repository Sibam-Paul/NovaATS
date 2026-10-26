import OpenAI from 'openai';

export interface ParsedExperience {
  company?: string;
  role?: string;
  duration?: string;
  summary?: string;
}

export interface ParsedResume {
  name: string;
  email: string | null;
  phone: string | null;
  skills: string[];
  experience: ParsedExperience[];
  summary: string;
}

/**
 * Returns an initialized OpenAI client using the OPENAI_API_KEY environment variable.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured in environment variables.');
  }
  return new OpenAI({ apiKey });
}

/**
 * Generates an embedding strictly locked to 768 dimensions using text-embedding-3-small.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 768,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding || embedding.length !== 768) {
    throw new Error(
      `OpenAI embedding generation failed or returned invalid dimension: ${embedding?.length}`
    );
  }

  return embedding;
}

/**
 * Parses raw resume text into structured JSON using OpenAI gpt-4o-mini with json_object response format.
 */
export async function parseResumeWithOpenAI(rawResumeText: string): Promise<ParsedResume> {
  const openai = getOpenAIClient();

  const systemInstruction = `You are an expert ATS (Applicant Tracking System) resume extraction engine.
Analyze the provided resume text thoroughly and extract candidate data into a strict JSON structure.
You MUST output ONLY a valid JSON object matching the following format without markdown fences or additional commentary:

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
      { role: 'user', content: `Extract the following resume text:\n\n${rawResumeText}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const rawJson = completion.choices[0]?.message?.content;
  if (!rawJson) {
    throw new Error('Received empty response from OpenAI gpt-4o-mini.');
  }

  const parsed = JSON.parse(rawJson);

  return {
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Unknown Candidate',
    email: typeof parsed.email === 'string' && parsed.email.trim() ? parsed.email.trim() : null,
    phone: typeof parsed.phone === 'string' && parsed.phone.trim() ? parsed.phone.trim() : null,
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.filter((s: unknown): s is string => typeof s === 'string')
      : [],
    experience: Array.isArray(parsed.experience)
      ? (parsed.experience as ParsedExperience[])
      : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
  };
}
