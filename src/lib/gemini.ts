import { GoogleGenAI } from '@google/genai';

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
 * Returns an initialized GoogleGenAI client using the GEMINI_API_KEY env variable.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Locks the vector output strictly to 768 dimensions to match the Supabase vector(768) schema.
 */
function enforce768Dimensions(vector: number[]): number[] {
  const TARGET_DIM = 768;
  if (vector.length === TARGET_DIM) {
    return vector;
  }
  if (vector.length > TARGET_DIM) {
    return vector.slice(0, TARGET_DIM);
  }
  return [...vector, ...new Array(TARGET_DIM - vector.length).fill(0)];
}

/**
 * Generates a strictly 768-dimensional vector embedding for the given text.
 * Uses gemini-embedding-001 with outputDimensionality: 768, and includes automatic fallback
 * to text-embedding-004 and embedding-001 to guarantee high availability.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGeminiClient();

  // User-configured override via env, followed by standard active models and fallbacks
  const envModel = process.env.GEMINI_EMBEDDING_MODEL;
  const candidateModels = [
    ...(envModel ? [envModel] : []),
    'gemini-embedding-001',
    'text-embedding-004',
    'embedding-001',
  ].filter((model, idx, arr) => arr.indexOf(model) === idx);

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      // Ensure no 'models/' prefix is accidentally duplicated
      const cleanModelName = model.replace(/^models\//, '');

      const response = await ai.models.embedContent({
        model: cleanModelName,
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });

      // Handle both SingleEmbedContentResponse and EmbedContentResponse shapes
      const res = response as unknown as {
        embedding?: { values?: number[] };
        embeddings?: Array<{ values?: number[] }>;
      };
      const embeddingValues = res.embedding?.values ?? res.embeddings?.[0]?.values;

      if (embeddingValues && embeddingValues.length > 0) {
        return enforce768Dimensions(embeddingValues);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[Embedding Fallback] Model "${model}" failed: ${lastError.message}. Trying next candidate...`);
    }
  }

  throw new Error(
    `Failed to generate embedding across candidate models [${candidateModels.join(', ')}]: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Parses raw resume text into structured JSON using Gemini 1.5 Flash with a strict system prompt.
 */
export async function parseResumeWithGemini(rawResumeText: string): Promise<ParsedResume> {
  const ai = getGeminiClient();

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

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    contents: `Extract the following resume text:\n\n${rawResumeText}`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error('Received empty response from Gemini 1.5 Flash.');
  }

  // Clean any markdown ticks just in case
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse Gemini output as JSON: ${err instanceof Error ? err.message : String(err)}\nRaw output: ${cleaned}`);
  }

  return {
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Unknown Candidate',
    email: typeof parsed.email === 'string' && parsed.email.trim() ? parsed.email.trim() : null,
    phone: typeof parsed.phone === 'string' && parsed.phone.trim() ? parsed.phone.trim() : null,
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.filter((s): s is string => typeof s === 'string')
      : [],
    experience: Array.isArray(parsed.experience)
      ? (parsed.experience as ParsedExperience[])
      : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
  };
}
