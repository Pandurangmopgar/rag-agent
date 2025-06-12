import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getPineconeIndex } from '@/lib/pinecone';
import { v4 as uuidv4 } from 'uuid';

// Disable Next.js body parsing for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });

// Rate limiting configuration
const BATCH_SIZE = 10; // Process 10 chunks at a time
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds between batches
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second base delay

function splitTextIntoChunks(text: string, maxChars: number = 1500, overlap: number = 200): string[] {
  // Clean the text first
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleanedText.length <= maxChars) {
    return [cleanedText];
  }
  
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < cleanedText.length) {
    const endIndex = startIndex + maxChars;
    
    // If this would be the last chunk, take everything remaining
    if (endIndex >= cleanedText.length) {
      const finalChunk = cleanedText.slice(startIndex).trim();
      if (finalChunk.length > 50) { // Only add if substantial content
        chunks.push(finalChunk);
      }
      break;
    }
    
    // Try to end at a sentence boundary within the chunk
    let chunkEndIndex = endIndex;
    const searchStart = Math.max(startIndex + maxChars - 200, startIndex + maxChars * 0.7);
    
    // Look for sentence endings working backwards from the max position
    for (let i = endIndex; i >= searchStart; i--) {
      const char = cleanedText[i];
      if (char === '.' || char === '!' || char === '?') {
        // Check if this is likely a real sentence end (followed by space and capital letter)
        const nextChar = cleanedText[i + 1];
        const charAfterNext = cleanedText[i + 2];
        if (nextChar === ' ' && charAfterNext && charAfterNext === charAfterNext.toUpperCase()) {
          chunkEndIndex = i + 1;
          break;
        }
      }
    }
    
    // If no good sentence boundary found, try word boundary
    if (chunkEndIndex === endIndex) {
      for (let i = endIndex; i >= searchStart; i--) {
        if (cleanedText[i] === ' ') {
          chunkEndIndex = i;
          break;
        }
      }
    }
    
    // Extract the chunk
    const chunk = cleanedText.slice(startIndex, chunkEndIndex).trim();
    
    if (chunk.length > 50) { // Only add chunks with substantial content
      chunks.push(chunk);
    }
    
    // Calculate next start position with overlap
    // Make sure we don't go backwards or create duplicate content
    const nextStart = Math.max(chunkEndIndex - overlap, startIndex + 1);
    startIndex = nextStart;
    
    // Safety check to prevent infinite loop
    if (nextStart >= chunkEndIndex) {
      startIndex = chunkEndIndex;
    }
  }
  
  // Debug logging to verify chunks are different
  console.log(`Created ${chunks.length} chunks from ${cleanedText.length} characters`);
  if (chunks.length > 1) {
    console.log('First chunk preview:', chunks[0].substring(0, 100) + '...');
    console.log('Last chunk preview:', chunks[chunks.length - 1].substring(0, 100) + '...');
  }
  
  return chunks.filter(chunk => chunk.length >= 50);
}



// Utility function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate embedding with retry logic
async function generateEmbeddingWithRetry(
  chunk: string, 
  retryCount = 0
): Promise<number[] | null> {
  try {
    const result = await genAI.models.embedContent({
      model: 'gemini-embedding-exp-03-07',
      contents: [chunk]
    });
    
    const embedding = result.embeddings?.[0]?.values;
    return embedding && embedding.length > 0 ? embedding : null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Check if it's a rate limit error
    if (errorMessage?.includes('429') || errorMessage?.includes('Too Many Requests')) {
      if (retryCount < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const retryDelay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Rate limited. Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await delay(retryDelay);
        return generateEmbeddingWithRetry(chunk, retryCount + 1);
      } else {
        console.error(`Max retries exceeded for embedding generation. Rate limit error: ${errorMessage}`);
        return null;
      }
    } else {
      console.error('Embedding generation error:', errorMessage);
      return null;
    }
  }
}

// Process chunks in batches with rate limiting
async function processChunksInBatches(
  chunks: string[], 
  fileName: string,
  onProgress?: (processed: number, total: number) => void
): Promise<Array<{ id: string; values: number[]; metadata: { text: string; source: string; chunk_index: number; total_chunks: number; timestamp: string; batch_number: number } }>> {
  const vectors = [];
  const totalChunks = chunks.length;
  
  // Process chunks in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`);
    
    // Process batch concurrently but with rate limiting
    const batchPromises = batch.map(async (chunk, batchIndex) => {
      const globalIndex = i + batchIndex;
      
      // Add small delay between requests within a batch
      if (batchIndex > 0) {
        await delay(200); // 200ms between individual requests
      }
      
      const embedding = await generateEmbeddingWithRetry(chunk);
      
      if (embedding) {
        return {
          id: uuidv4(),
          values: embedding,
          metadata: {
            text: chunk,
            source: fileName,
            chunk_index: globalIndex,
            total_chunks: totalChunks,
            timestamp: new Date().toISOString(),
            batch_number: batchNumber,
          },
        };
      }
      return null;
    });
    
    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter(result => result !== null);
    vectors.push(...validResults);
    
    // Report progress
    const processed = i + batch.length;
    onProgress?.(processed, totalChunks);
    
    // Add delay between batches (except for the last batch)
    if (i + BATCH_SIZE < chunks.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }
  
  return vectors;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'Google API key is not configured' },
        { status: 500 }
      );
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('document') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No document file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['.pdf', '.txt', '.md'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Please upload a PDF, TXT, or MD file.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB.' },
        { status: 400 }
      );
    }

    // Read file content based on file type
    let fileContent: string;
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      if (fileExtension === '.pdf') {
        // Parse PDF content using dynamic import to avoid webpack bundling issues
        const pdfParse = (await import('pdf-parse')).default;
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdfParse(buffer);
        fileContent = pdfData.text;
        
        if (!fileContent || fileContent.trim().length === 0) {
          return NextResponse.json(
            { error: 'Could not extract text from PDF. Please ensure the PDF contains readable text.' },
            { status: 400 }
          );
        }
      } else {
        // Handle text files (.txt, .md)
        fileContent = new TextDecoder('utf-8').decode(arrayBuffer);
      }
      
      // Validate that we have readable content
      if (!fileContent || fileContent.trim().length === 0) {
        return NextResponse.json(
          { error: 'No readable content found in the file.' },
          { status: 400 }
        );
      }
      
    } catch (error) {
      console.error('File parsing error:', error);
      return NextResponse.json(
        { error: 'Failed to parse file content. Please ensure the file is valid and readable.' },
        { status: 400 }
      );
    }

    // Check if file has content
    if (!fileContent.trim()) {
      return NextResponse.json(
        { error: 'The file appears to be empty or contains no readable text.' },
        { status: 400 }
      );
    }

    // Split content into chunks
    const chunks = splitTextIntoChunks(fileContent);
    
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No content could be extracted from the document' },
        { status: 400 }
      );
    }

    // Warn about large documents
    if (chunks.length > 100) {
      console.log(`Warning: Large document with ${chunks.length} chunks. This will take several minutes to process due to API rate limits.`);
    }

    // Process chunks in batches with rate limiting
    console.log(`Starting to process ${chunks.length} chunks in batches of ${BATCH_SIZE}`);
    const vectors = await processChunksInBatches(chunks, file.name, (processed, total) => {
      console.log(`Progress: ${processed}/${total} chunks processed (${Math.round(processed/total*100)}%)`);
    });

    if (vectors.length === 0) {
      return NextResponse.json(
        { error: 'Failed to process any chunks from the document. This may be due to API rate limits. Please try again with a smaller document or wait a few minutes.' },
        { status: 500 }
      );
    }

    // Get Pinecone index
    const index = getPineconeIndex();

    // Upsert vectors to Pinecone in batches
    try {
      const UPSERT_BATCH_SIZE = 100; // Pinecone recommends batches of 100
      
      for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
        const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
        await index.upsert(batch);
        console.log(`Upserted batch ${Math.floor(i/UPSERT_BATCH_SIZE) + 1}/${Math.ceil(vectors.length/UPSERT_BATCH_SIZE)} to Pinecone`);
      }
    } catch (pineconeError) {
      console.error('Pinecone upsert error:', pineconeError);
      return NextResponse.json(
        { error: 'Failed to store document in the knowledge base. Please try again.' },
        { status: 500 }
      );
    }

    const successRate = (vectors.length / chunks.length * 100).toFixed(1);
    
    return NextResponse.json({
      status: 'ok',
      chunks: vectors.length,
      message: `Successfully processed ${vectors.length}/${chunks.length} chunks from ${file.name} (${successRate}% success rate)`,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: fileExtension,
        chunksCreated: vectors.length,
        totalChunks: chunks.length,
        successRate: `${successRate}%`,
        processingTime: 'Completed with rate limiting'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error during file upload. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed. Use POST to upload documents.',
      supportedFormats: ['.pdf', '.txt', '.md'],
      maxSize: '10MB',
      rateLimits: {
        batchSize: BATCH_SIZE,
        delayBetweenBatches: `${DELAY_BETWEEN_BATCHES}ms`,
        maxRetries: MAX_RETRIES
      }
    },
    { status: 405 }
  );
}