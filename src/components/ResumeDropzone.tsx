'use client';

import React, { useState, useRef } from 'react';
import { FileTextIcon, SparklesIcon, Spinner, UploadCloudIcon } from './icons';
import { Candidate } from '@/types/database';

interface ResumeDropzoneProps {
  jobId: string;
  onCandidateAdded: (newCandidate: Candidate) => void;
}

export default function ResumeDropzone({ jobId, onCandidateAdded }: ResumeDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    setProcessingStatus('Uploading PDF and extracting text...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('job_id', jobId);

      // Simulate helpful progress message during AI pipeline execution
      const timer = setTimeout(() => {
        setProcessingStatus('OpenAI gpt-4o-mini parsing resume & skills...');
      }, 1200);

      const timer2 = setTimeout(() => {
        setProcessingStatus('Generating 768-dim vector embedding & saving...');
      }, 2800);

      const res = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(timer);
      clearTimeout(timer2);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process resume');
      }

      setSuccessMsg(`Successfully added ${data.candidate.name} to the pipeline!`);
      onCandidateAdded(data.candidate);

      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during resume upload.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isProcessing) fileInputRef.current?.click();
        }}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.005]'
            : isProcessing
            ? 'border-zinc-700 bg-zinc-900/50 cursor-not-allowed'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3 text-center py-2">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Spinner className="w-6 h-6" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100 flex items-center justify-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-indigo-400 animate-pulse" />
                AI Pipeline Processing
              </p>
              <p className="text-xs text-zinc-400 mt-1">{processingStatus}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center py-1">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition">
              <UploadCloudIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                <span className="text-indigo-400 hover:underline">Click to upload</span> or drag and drop candidate resume
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                PDF format only. OpenAI gpt-4o-mini will automatically extract candidate data & skills.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300 font-bold ml-2">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

