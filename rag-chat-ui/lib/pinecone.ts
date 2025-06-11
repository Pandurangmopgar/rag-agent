import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('PINECONE_API_KEY is required');
}

if (!process.env.PINECONE_ENVIRONMENT) {
  throw new Error('PINECONE_ENVIRONMENT is required');
}

if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error('PINECONE_INDEX_NAME is required');
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
 
});

export function getPineconeIndex() {
  return pinecone.Index(process.env.PINECONE_INDEX_NAME!);
}

export { pinecone }; 