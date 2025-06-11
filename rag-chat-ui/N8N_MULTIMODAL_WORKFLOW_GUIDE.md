# N8N Multimodal Workflow Setup Guide

## Overview
This guide shows how to modify your existing N8N workflow to handle both text-only RAG queries and multimodal (text + image) queries using Google Gemini 2.0 Flash.

## Architecture Decision
We're **modifying the existing workflow** rather than creating a separate one because:
- ✅ Single endpoint for frontend
- ✅ Can combine RAG search with image analysis  
- ✅ Better user experience
- ✅ Easier to maintain

## Required N8N Nodes

### 1. Webhook (Entry Point) - MODIFY EXISTING
**Purpose**: Receive requests from your Next.js frontend
**Settings**:
```javascript
// Webhook receives this payload structure:
{
  "question": "string",
  "sessionId": "string", 
  "hasImage": boolean,
  "isMultimodal": boolean,
  "image": "base64_string", // Optional
  "imageType": "string", // Optional (e.g., "image/jpeg")
  "timestamp": "ISO_string"
}
```

### 2. IF Node - ADD NEW
**Purpose**: Route to different processing based on image presence
**Settings**:
- **Condition**: `{{ $json.isMultimodal }}`
- **True**: Route to multimodal processing
- **False**: Route to existing RAG processing

## Workflow Branches

### Branch A: Text-Only RAG (Existing Flow)
**When**: `isMultimodal = false`
**Flow**: Keep your existing RAG workflow:
1. Pinecone vector search
2. Context retrieval  
3. OpenAI/Gemini text generation
4. Return answer + sources

### Branch B: Multimodal Processing (New Flow)
**When**: `isMultimodal = true`

#### Step 1: HTTP Request to Google Gemini 2.0 Flash
**Purpose**: Analyze image + answer question
**Settings**:
```javascript
// Method: POST
// URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent

// Headers:
{
  "Content-Type": "application/json",
  "x-goog-api-key": "{{ $env.GOOGLE_API_KEY }}"
}

// Body:
{
  "contents": [{
    "parts": [
      {
        "text": "{{ $json.question || 'Analyze this image and describe what you see.' }}"
      },
      {
        "inline_data": {
          "mime_type": "{{ $json.imageType }}",
          "data": "{{ $json.image }}"
        }
      }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["Text"],
    "temperature": 0.7,
    "topK": 32,
    "topP": 1,
    "maxOutputTokens": 2048
  }
}
```

#### Step 2: Code Node - Process Gemini Response  
**Purpose**: Extract and format the response
```javascript
// Input from Gemini HTTP request
const response = items[0].json;

// Extract the generated text
let answer = 'I apologize, but I could not analyze the image.';
let sources = [];

if (response.candidates && response.candidates.length > 0) {
  const candidate = response.candidates[0];
  if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
    answer = candidate.content.parts[0].text || answer;
  }
}

// Optional: Add RAG context for text-based questions about images
if ($json.question && $json.question.trim() !== '') {
  // You could still do a vector search here to provide additional context
  sources = ['Gemini 2.0 Flash Vision Analysis'];
} else {
  sources = ['Gemini 2.0 Flash Vision Analysis'];
}

return {
  answer: answer,
  sources: sources,
  sessionId: $json.sessionId,
  isMultimodal: true,
  processingType: 'vision'
};
```

## Enhanced Workflow (Optional): Combine RAG + Vision

For even better results, you can combine both approaches:

### Enhanced Branch B: Multimodal + RAG
1. **Gemini Vision Analysis** (as above)
2. **Code Node**: Extract key terms from image analysis
3. **Pinecone Search**: Search for relevant documents using extracted terms  
4. **Gemini Text Generation**: Combine image analysis + RAG context
5. **Return enhanced response**

#### Enhanced Gemini Request:
```javascript
{
  "contents": [{
    "parts": [
      {
        "text": `Context from documents: {{ $json.ragContext }}\n\nUser question: {{ $json.question }}\n\nPlease analyze the image and answer the question using both the image content and the provided context.`
      },
      {
        "inline_data": {
          "mime_type": "{{ $json.imageType }}",
          "data": "{{ $json.image }}"
        }
      }
    ]
  }]
}
```

## Environment Variables Needed

Add these to your N8N environment:
```bash
GOOGLE_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=your_existing_pinecone_key
PINECONE_ENVIRONMENT=your_existing_pinecone_env
PINECONE_INDEX_NAME=your_existing_pinecone_index
```

## Testing the Workflow

### Test Payload 1: Text Only
```json
{
  "question": "What is machine learning?",
  "sessionId": "test_session_1",
  "hasImage": false,
  "isMultimodal": false,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Test Payload 2: Image + Text
```json
{
  "question": "What do you see in this image?",
  "sessionId": "test_session_2", 
  "hasImage": true,
  "isMultimodal": true,
  "image": "base64_encoded_image_data_here",
  "imageType": "image/jpeg",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Test Payload 3: Image Only
```json
{
  "question": "",
  "sessionId": "test_session_3",
  "hasImage": true, 
  "isMultimodal": true,
  "image": "base64_encoded_image_data_here",
  "imageType": "image/png",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Expected Response Format

Your workflow should return:
```json
{
  "answer": "Generated response text here...",
  "sources": ["source1", "source2"],
  "sessionId": "session_id_here",
  "isMultimodal": true/false,
  "processingType": "rag" | "vision" | "combined"
}
```

## Error Handling

Add error handling nodes:
1. **HTTP Request Error**: Handle Gemini API failures
2. **Rate Limiting**: Handle 429 responses  
3. **Image Size Error**: Handle oversized images
4. **Fallback Response**: Provide meaningful error messages

## Monitoring & Logging

Add logging nodes to track:
- Multimodal vs text-only requests
- Processing times
- Error rates
- Image analysis success rates

## Performance Considerations

1. **Image Size**: Frontend limits to 10MB, but consider smaller limits for faster processing
2. **Caching**: Consider caching image analysis results for identical images
3. **Rate Limits**: Gemini has rate limits - implement queuing if needed
4. **Cost**: Vision API calls cost more than text-only

## Security Notes

1. **API Keys**: Store in N8N environment variables, not in workflow
2. **Image Data**: Images are passed as base64 - consider data retention policies
3. **Content Filtering**: Consider content moderation for uploaded images
4. **Rate Limiting**: Implement user-based rate limiting if needed

This setup gives you a powerful multimodal RAG assistant that can handle both traditional document queries and visual analysis questions! 