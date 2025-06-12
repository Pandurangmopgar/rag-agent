# RAG Chat UI Test Suite

This folder contains a comprehensive test suite for the RAG Chat UI application.

## Features Tested

### 🔧 API Endpoints
- `/api/ask` - Chat functionality and N8N webhook integration
- `/api/upload` - Document upload and processing
- `/api/messages` - Message retrieval
- `/api/conversations` - Conversation management
- `/api/image-analysis` - Image analysis functionality

### 🖥️ Frontend
- Home page loading and accessibility
- CORS headers and cross-origin requests

### ⚡ Performance
- Load handling with concurrent requests
- Rate limiting and error handling
- Response time validation

### 📄 Document Processing
- File upload validation
- Text extraction and chunking
- Vector embedding generation
- RAG search functionality

## Prerequisites

1. **Start the Development Server**
   ```bash
   cd rag-chat-ui
   npm run dev
   ```

2. **Environment Configuration**
   Make sure your `.env.local` file contains:
   ```env
   NEXT_PUBLIC_N8N_WEBHOOK_URL=your_n8n_webhook_url
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_ENVIRONMENT=your_pinecone_environment
   PINECONE_INDEX_NAME=your_pinecone_index_name
   GOOGLE_API_KEY=your_google_api_key
   ```

## Running Tests

### Quick Test (No Dependencies)
```bash
cd tests
node rag-chat-test.js
```

### Custom Configuration
You can override the default server URL:
```bash
APP_URL=http://localhost:3000 node rag-chat-test.js
```

## Test Categories

### ✅ Core Functionality Tests
- API endpoint availability
- Request/response validation
- Error handling
- Data processing

### 🔄 Integration Tests
- N8N webhook communication
- Pinecone vector storage
- Google AI embeddings
- File upload pipeline

### 🚀 Performance Tests
- Concurrent request handling
- Rate limiting behavior
- Server stability under load

## Understanding Test Results

### Success Indicators
- ✅ **Green checkmarks**: Tests passed successfully
- 📊 **Success rate > 80%**: Good overall functionality
- 🎉 **All tests passed**: Perfect configuration

### Common Issues
- ❌ **500 errors**: External services not configured (N8N, Pinecone, Google AI)
- ❌ **Connection errors**: Development server not running
- ❌ **400 errors**: API validation issues

### Expected Partial Failures
Some tests may fail if external services aren't configured:
- N8N webhook tests (if webhook URL is invalid)
- Document upload tests (if Pinecone/Google AI keys are missing)
- This is normal for development environments

## Test Coverage

| Feature | Endpoint | Test Type | Description |
|---------|----------|-----------|-------------|
| Chat | `/api/ask` | Integration | Tests Q&A functionality |
| Upload | `/api/upload` | Integration | Tests document processing |
| Messages | `/api/messages` | API | Tests message retrieval |
| Conversations | `/api/conversations` | API | Tests conversation management |
| Frontend | `/` | E2E | Tests page loading |
| Performance | Multiple | Load | Tests concurrent requests |

## Troubleshooting

### Server Not Running
```
❌ Server is not accessible. Please start the development server first:
   npm run dev
```
**Solution**: Start the Next.js development server

### Missing Environment Variables
```
❌ N8N webhook URL is not configured
```
**Solution**: Add required environment variables to `.env.local`

### External Service Errors
```
❌ Failed to connect to Pinecone/Google AI
```
**Solution**: Verify API keys and service availability

## Manual Testing Checklist

After running automated tests, manually verify:

1. **Chat Interface**
   - [ ] Can send messages
   - [ ] Receives AI responses
   - [ ] Shows typing indicators
   - [ ] Displays error messages

2. **Document Upload**
   - [ ] Can select files
   - [ ] Shows upload progress
   - [ ] Displays success/error messages
   - [ ] Processes different file types

3. **UI Components**
   - [ ] Theme switching works
   - [ ] Memory panel functions
   - [ ] Animations are smooth
   - [ ] Mobile responsive

4. **RAG Functionality**
   - [ ] Upload a test document
   - [ ] Ask questions about the content
   - [ ] Verify accurate responses
   - [ ] Check source citations

## Contributing

To add new tests:

1. Add test methods to the `RAGChatTester` class
2. Call them in the `runAllTests()` method
3. Follow the existing pattern for error handling
4. Update this README with new test descriptions

## Support

If tests are failing unexpectedly:
1. Check server logs for errors
2. Verify environment configuration
3. Ensure all services are running
4. Review the test output for specific error messages 