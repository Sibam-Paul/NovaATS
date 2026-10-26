import { NextRequest } from 'next/server';
import { POST as jobsPost } from '@/app/api/jobs/route';
import { POST as uploadPost } from '@/app/api/upload-resume/route';

async function testJobsValidation() {
  console.log('Testing /api/jobs validation...');
  const req = new NextRequest('http://localhost:3000/api/jobs', {
    method: 'POST',
    body: JSON.stringify({ title: '' }),
  });
  const res = await jobsPost(req);
  console.log('Status for empty title:', res.status);
  const data = await res.json();
  console.log('Response data:', data);
  if (res.status !== 400 || !data.error) {
    throw new Error('Expected 400 with error message');
  }
}

async function testUploadValidation() {
  console.log('Testing /api/upload-resume validation...');
  const formData = new FormData();
  const req = new NextRequest('http://localhost:3000/api/upload-resume', {
    method: 'POST',
    body: formData,
  });
  const res = await uploadPost(req);
  console.log('Status for missing file:', res.status);
  const data = await res.json();
  console.log('Response data:', data);
  if (res.status !== 400 || !data.error) {
    throw new Error('Expected 400 with error message');
  }
}

async function run() {
  await testJobsValidation();
  await testUploadValidation();
  console.log('✓ Validation tests passed.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

