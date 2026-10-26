export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CandidateStatus = 'applied' | 'screening' | 'interview' | 'rejected';

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  embedding: number[] | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  job_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  skills_json: string[];
  experience_json: Array<{
    company?: string;
    role?: string;
    duration?: string;
    summary?: string;
  }>;
  raw_resume_text: string | null;
  embedding: number[] | null;
  status: CandidateStatus;
  similarity?: number;
  created_at: string;
}

export interface MatchCandidateResult {
  id: string;
  job_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  skills_json: Json;
  experience_json: Json;
  raw_resume_text: string | null;
  embedding: number[] | null;
  status: string;
  similarity: number;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          title: string;
          description: string;
          requirements: string | null;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          requirements?: string | null;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          requirements?: string | null;
          embedding?: number[] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      candidates: {
        Row: {
          id: string;
          job_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          skills_json: Json;
          experience_json: Json;
          raw_resume_text: string | null;
          embedding: number[] | null;
          status: CandidateStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          skills_json?: Json;
          experience_json?: Json;
          raw_resume_text?: string | null;
          embedding?: number[] | null;
          status?: CandidateStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          skills_json?: Json;
          experience_json?: Json;
          raw_resume_text?: string | null;
          embedding?: number[] | null;
          status?: CandidateStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_candidates: {
        Args: {
          query_embedding: number[];
          filter_job_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: MatchCandidateResult[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
