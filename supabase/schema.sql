-- ==============================================================================
-- ATS (Applicant Tracking System) Database Schema & Vector Migration
-- ==============================================================================

-- 1. Enable pgvector extension for semantic vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create 'jobs' table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create 'candidates' table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_resume_text TEXT,
  embedding VECTOR(768),
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'screening', 'interview', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance & Relational Indexes
CREATE INDEX IF NOT EXISTS candidates_job_id_idx ON candidates(job_id);
CREATE INDEX IF NOT EXISTS candidates_job_id_status_idx ON candidates(job_id, status);

-- Vector Similarity Indexes (HNSW for fast approximate nearest neighbor search via cosine distance)
CREATE INDEX IF NOT EXISTS jobs_embedding_hnsw_idx 
  ON jobs 
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS candidates_embedding_hnsw_idx 
  ON candidates 
  USING hnsw (embedding vector_cosine_ops);

-- 4. Vector matching function for candidate ranking
-- Performs cosine similarity search using the <=> distance operator
-- Cosine similarity = 1 - (candidates.embedding <=> query_embedding)
-- Note: 'filter_job_id' is used as the input parameter to prevent PL/pgSQL
-- 42P13 collision with the 'job_id' column in RETURNS TABLE.
CREATE OR REPLACE FUNCTION match_candidates(
  query_embedding VECTOR(768),
  filter_job_id UUID,
  match_threshold FLOAT DEFAULT -1.0,
  match_count INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  job_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  skills_json JSONB,
  experience_json JSONB,
  raw_resume_text TEXT,
  embedding VECTOR(768),
  status TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.job_id,
    c.name,
    c.email,
    c.phone,
    c.skills_json,
    c.experience_json,
    c.raw_resume_text,
    c.embedding,
    c.status,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity,
    c.created_at
  FROM candidates c
  WHERE c.job_id = filter_job_id
    AND c.embedding IS NOT NULL
    AND (match_threshold IS NULL OR (1 - (c.embedding <=> query_embedding)) >= match_threshold)
  ORDER BY c.embedding <=> query_embedding ASC
  LIMIT COALESCE(match_count, 100);
END;
$$;

-- 5. Row Level Security (RLS) Setup
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for anon & authenticated roles (adjust as required for production auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow public access to jobs'
  ) THEN
    CREATE POLICY "Allow public access to jobs" ON jobs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'candidates' AND policyname = 'Allow public access to candidates'
  ) THEN
    CREATE POLICY "Allow public access to candidates" ON candidates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Grant execution permissions on function to public/authenticated/anon
GRANT EXECUTE ON FUNCTION match_candidates(VECTOR(768), UUID, FLOAT, INT) TO anon, authenticated, service_role;
