import { extractTextFromPdf } from '@/lib/pdf';

async function verifyPdfExtraction() {
  console.log('--- 1. Testing PDF Text Extraction ---');
  // Minimal valid PDF with text "Jane Doe - Full Stack Developer"
  const samplePdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj
4 0 obj<</Length 73>>stream
BT /F1 12 Tf 50 100 Td (Jane Doe - Senior Full Stack Engineer) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
339
%%EOF`;

  const extracted = await extractTextFromPdf(Buffer.from(samplePdf));
  console.log('Extracted text:', JSON.stringify(extracted));
  if (!extracted.includes('Jane Doe')) {
    throw new Error('PDF extraction did not find expected text');
  }
  console.log('✓ PDF extraction verified successfully.');
}

async function verifyRouteEndpoints() {
  console.log('\n--- 2. Verifying Route Imports and Types ---');
  const jobsRoute = await import('@/app/api/jobs/route');
  const uploadRoute = await import('@/app/api/upload-resume/route');
  const matchRoute = await import('@/app/api/jobs/[id]/match/route');
  const candidateRoute = await import('@/app/api/candidates/[id]/route');

  if (typeof jobsRoute.POST !== 'function' || typeof jobsRoute.GET !== 'function') {
    throw new Error('/api/jobs does not export GET and POST');
  }
  if (typeof uploadRoute.POST !== 'function') {
    throw new Error('/api/upload-resume does not export POST');
  }
  if (typeof matchRoute.POST !== 'function') {
    throw new Error('/api/jobs/[id]/match does not export POST');
  }
  if (typeof candidateRoute.PATCH !== 'function') {
    throw new Error('/api/candidates/[id] does not export PATCH');
  }
  console.log('✓ All API route handlers exported and typed properly.');
}

async function main() {
  try {
    await verifyPdfExtraction();
    await verifyRouteEndpoints();
    console.log('\n=======================================');
    console.log('✓ PHASE 2 VERIFICATION PASSED SUCCESSFULLY');
    console.log('=======================================');
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

main();

