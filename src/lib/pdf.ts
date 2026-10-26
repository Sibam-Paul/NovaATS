import { PDFParse } from 'pdf-parse';

/**
 * Extracts plain text from a PDF Buffer or Uint8Array.
 */
export async function extractTextFromPdf(data: Buffer | Uint8Array): Promise<string> {
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text ? result.text.trim() : '';
  } catch (error) {
    throw new Error(
      `PDF parsing failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    try {
      await parser.destroy();
    } catch {
      // Ignore cleanup error
    }
  }
}

