import pdf from 'pdf-parse';

/**
 * Extracts plain text from a PDF Buffer using pdf-parse.
 */
export async function extractTextFromPdf(data: Buffer): Promise<string> {
  const pdfData = await pdf(data);
  return pdfData.text ? pdfData.text.trim() : '';
}
