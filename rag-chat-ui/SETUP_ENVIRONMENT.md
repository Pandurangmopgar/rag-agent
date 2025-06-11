# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

### For Document RAG (Existing Feature)
```bash
# N8N Webhook for document RAG processing
NEXT_PUBLIC_N8N_WEBHOOK_URL=your_n8n_webhook_url_here

# Pinecone for document embedding storage
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment_here
PINECONE_INDEX_NAME=your_pinecone_index_name_here
```

### For Image Analysis (New Feature)
```bash
# Google Gemini API for image analysis
GOOGLE_API_KEY=your_google_gemini_api_key_here
```

### For Persistent Conversation History (New Feature)
```bash
# Supabase for conversation storage (Recommended)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
STORAGE_PROVIDER=supabase

# OR Upstash Redis for conversation storage (Alternative)
# UPSTASH_REDIS_REST_URL=your_upstash_redis_url
# UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
# STORAGE_PROVIDER=upstash
```

## How to Get API Keys

### 1. Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key to `GOOGLE_API_KEY`

### 2. N8N Webhook URL
- Use your existing N8N workflow webhook URL
- This should already be configured for your document RAG

### 3. Pinecone Configuration
- Use your existing Pinecone configuration
- This should already be set up for document embedding storage

### 4. Supabase Configuration (For Persistent Conversations)
1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to Settings → API in your Supabase dashboard
3. Copy your Project URL to `NEXT_PUBLIC_SUPABASE_URL`
4. Copy your anon public key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Run the SQL schema from `SUPABASE_SAFE_SETUP.sql` in the SQL Editor
6. Set `STORAGE_PROVIDER=supabase`

## Testing Your Setup

### Test Document RAG (Text Query)
```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is in my documents?",
    "sessionId": "test_session"
  }'
```

### Test Image Analysis
```bash
curl -X POST http://localhost:3000/api/image-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What do you see in this image?",
    "image": "base64_encoded_image_data",
    "imageType": "image/jpeg",
    "sessionId": "test_session"
  }'
```

## Security Notes

1. **Never commit `.env.local`** to version control
2. **Add `.env.local` to `.gitignore`** if not already present
3. **Use different API keys** for development and production
4. **Rotate API keys regularly** for security

## Architecture Overview

- **Text queries**: Frontend → `/api/ask` → N8N → RAG Processing
- **Image queries**: Frontend → `/api/image-analysis` → Gemini 2.0 Flash
- **Complete separation**: Document RAG and image analysis are independent

This clean separation means:
✅ Your existing document RAG continues to work unchanged
✅ Image analysis is a new, separate feature
✅ Easy to maintain and debug
✅ Optimal performance for each content type 