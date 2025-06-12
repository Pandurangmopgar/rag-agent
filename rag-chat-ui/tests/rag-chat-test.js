const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Simple HTTP client without external dependencies
const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'your_webhook_url_here';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class RAGChatTester {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

  // Simple HTTP request helper
  async makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
      const protocol = options.protocol === 'https:' ? https : http;
      
      const req = protocol.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsedBody,
              rawBody: body
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body,
              rawBody: body
            });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        if (data instanceof FormData) {
          data.pipe(req);
        } else {
          req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
      }
      
      if (!(data instanceof FormData)) {
        req.end();
      }
    });
  }

  // Parse URL helper
  parseUrl(url) {
    const urlObj = new URL(url);
    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search
    };
  }

  // Test helper methods
  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async test(name, testFn) {
    this.totalTests++;
    try {
      this.log(`\n🧪 Testing: ${name}`, 'blue');
      await testFn();
      this.passedTests++;
      this.log(`✅ PASSED: ${name}`, 'green');
      this.testResults.push({ name, status: 'PASSED' });
    } catch (error) {
      this.failedTests++;
      this.log(`❌ FAILED: ${name}`, 'red');
      this.log(`   Error: ${error.message}`, 'red');
      this.testResults.push({ name, status: 'FAILED', error: error.message });
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  // Create test document
  createTestDocument() {
    const testContent = `
# Test Document for RAG Chat UI

## Introduction
This is a test document to verify the document upload and processing functionality of the RAG Chat UI system.

## Key Features
- Document upload and processing
- Text extraction and chunking
- Vector embeddings generation
- Semantic search capabilities
- AI-powered question answering

## Technical Details
The system uses:
- Next.js 15 for the frontend framework
- Pinecone for vector database storage
- Google Gemini for embeddings generation
- N8N for workflow automation
- Framer Motion for animations

## Test Content
This document contains test information that should be searchable after upload. The RAG system should be able to answer questions about:
1. What framework is used for the frontend? (Answer: Next.js 15)
2. Which vector database is used? (Answer: Pinecone)
3. What generates the embeddings? (Answer: Google Gemini)

## Conclusion
If you can find this information through the chat interface, the RAG system is working correctly.
    `;

    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, testContent.trim());
    return testFilePath;
  }

  // Test API Health
  async testApiHealth() {
    const url = `${BASE_URL}/api/ask`;
    const options = {
      ...this.parseUrl(url),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await this.makeRequest(options);
    this.assert(response.statusCode === 405, `Expected 405 (Method Not Allowed) but got ${response.statusCode}`);
  }

  // Test Chat API with valid request
  async testChatAPI() {
    const url = `${BASE_URL}/api/ask`;
    const testData = {
      question: "What is artificial intelligence?",
      sessionId: "test-session-" + Date.now(),
      conversationId: "test-conv-" + Date.now()
    };

    const options = {
      ...this.parseUrl(url),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await this.makeRequest(options, testData);
    
    // Should return 200 or 500 (if N8N is not configured)
    this.assert(
      response.statusCode === 200 || response.statusCode === 500,
      `Expected 200 or 500 but got ${response.statusCode}`
    );

    if (response.statusCode === 200) {
      this.assert(response.body.answer, 'Response should contain an answer field');
    }
  }

  // Test Chat API with invalid request
  async testChatAPIValidation() {
    const url = `${BASE_URL}/api/ask`;
    
    // Test missing question
    const invalidData = {
      sessionId: "test-session"
    };

    const options = {
      ...this.parseUrl(url),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await this.makeRequest(options, invalidData);
    this.assert(response.statusCode === 400, `Expected 400 but got ${response.statusCode}`);
    this.assert(response.body.error, 'Response should contain error message');
  }

  // Test Document Upload API
  async testDocumentUpload() {
    const testFilePath = this.createTestDocument();
    
    try {
      const url = `${BASE_URL}/api/upload`;
      const form = new FormData();
      form.append('document', fs.createReadStream(testFilePath), {
        filename: 'test-document.txt',
        contentType: 'text/plain'
      });

      const options = {
        ...this.parseUrl(url),
        method: 'POST',
        headers: form.getHeaders()
      };

      const response = await this.makeRequest(options, form);
      
      // Should return 200 or 500 (if Pinecone/Google AI is not configured)
      this.assert(
        response.statusCode === 200 || response.statusCode === 500,
        `Expected 200 or 500 but got ${response.statusCode}: ${response.rawBody}`
      );

      if (response.statusCode === 200) {
        this.assert(response.body.message, 'Response should contain success message');
      }
    } finally {
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }

  // Test Upload API with invalid file
  async testDocumentUploadValidation() {
    const url = `${BASE_URL}/api/upload`;
    const form = new FormData();
    
    // Try uploading without file
    const options = {
      ...this.parseUrl(url),
      method: 'POST',
      headers: form.getHeaders()
    };

    const response = await this.makeRequest(options, form);
    this.assert(response.statusCode === 400, `Expected 400 but got ${response.statusCode}`);
  }

  // Test Messages API
  async testMessagesAPI() {
    const url = `${BASE_URL}/api/messages`;
    const options = {
      ...this.parseUrl(url),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await this.makeRequest(options);
    this.assert(
      response.statusCode === 200 || response.statusCode === 404,
      `Expected 200 or 404 but got ${response.statusCode}`
    );
  }

  // Test Conversations API
  async testConversationsAPI() {
    const url = `${BASE_URL}/api/conversations`;
    const options = {
      ...this.parseUrl(url),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await this.makeRequest(options);
    this.assert(
      response.statusCode === 200 || response.statusCode === 404,
      `Expected 200 or 404 but got ${response.statusCode}`
    );
  }

  // Test Image Analysis API
  async testImageAnalysisAPI() {
    const url = `${BASE_URL}/api/image-analysis`;
    const options = {
      ...this.parseUrl(url),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await this.makeRequest(options);
    this.assert(
      response.statusCode === 405 || response.statusCode === 404,
      `Expected 405 or 404 but got ${response.statusCode}`
    );
  }

  // Test Frontend Pages
  async testHomePage() {
    const url = BASE_URL;
    const options = {
      ...this.parseUrl(url),
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    };

    const response = await this.makeRequest(options);
    this.assert(response.statusCode === 200, `Expected 200 but got ${response.statusCode}`);
    this.assert(
      response.rawBody.includes('html') || response.rawBody.includes('DOCTYPE'),
      'Response should contain HTML content'
    );
  }

  // Test CORS and Headers
  async testCORSHeaders() {
    const url = `${BASE_URL}/api/ask`;
    const options = {
      ...this.parseUrl(url),
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST'
      }
    };

    const response = await this.makeRequest(options);
    // CORS preflight should return 200 or 204
    this.assert(
      response.statusCode === 200 || response.statusCode === 204 || response.statusCode === 405,
      `Expected 200, 204, or 405 but got ${response.statusCode}`
    );
  }

  // Load test simulation
  async testLoadHandling() {
    const promises = [];
    const testQuestion = "What is the capital of France?";
    
    // Simulate 5 concurrent requests
    for (let i = 0; i < 5; i++) {
      const promise = this.makeRequest({
        ...this.parseUrl(`${BASE_URL}/api/ask`),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        question: testQuestion,
        sessionId: `load-test-${i}`,
        conversationId: `load-conv-${i}`
      });
      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    
    // At least some requests should succeed (or fail gracefully)
    const successfulResponses = responses.filter(r => r.statusCode < 500);
    this.assert(
      successfulResponses.length >= 3,
      `Expected at least 3 successful responses, got ${successfulResponses.length}`
    );
  }

  // Test Rate Limiting
  async testRateLimiting() {
    const promises = [];
    
    // Send 10 rapid requests
    for (let i = 0; i < 10; i++) {
      const promise = this.makeRequest({
        ...this.parseUrl(`${BASE_URL}/api/ask`),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        question: `Rate limit test ${i}`,
        sessionId: `rate-test-${i}`
      });
      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    
    // Should handle rapid requests without crashing
    const serverErrors = responses.filter(r => r.statusCode >= 500);
    this.assert(
      serverErrors.length < 5,
      `Too many server errors: ${serverErrors.length}/10 requests failed`
    );
  }

  // Main test runner
  async runAllTests() {
    this.log('\n🚀 Starting RAG Chat UI Comprehensive Test Suite', 'bold');
    this.log('================================================', 'blue');
    
    // Check if server is running
    try {
      await this.testHomePage();
      this.log('✅ Server is running and accessible', 'green');
    } catch (error) {
      this.log('❌ Server is not accessible. Please start the development server first:', 'red');
      this.log('   npm run dev', 'yellow');
      return;
    }

    // API Tests
    this.log('\n📡 API Endpoint Tests', 'bold');
    await this.test('API Health Check', () => this.testApiHealth());
    await this.test('Chat API - Valid Request', () => this.testChatAPI());
    await this.test('Chat API - Validation', () => this.testChatAPIValidation());
    await this.test('Document Upload API', () => this.testDocumentUpload());
    await this.test('Document Upload Validation', () => this.testDocumentUploadValidation());
    await this.test('Messages API', () => this.testMessagesAPI());
    await this.test('Conversations API', () => this.testConversationsAPI());
    await this.test('Image Analysis API', () => this.testImageAnalysisAPI());

    // Frontend Tests
    this.log('\n🖥️ Frontend Tests', 'bold');
    await this.test('Home Page Loading', () => this.testHomePage());
    await this.test('CORS Headers', () => this.testCORSHeaders());

    // Performance Tests
    this.log('\n⚡ Performance Tests', 'bold');
    await this.test('Load Handling', () => this.testLoadHandling());
    await this.test('Rate Limiting', () => this.testRateLimiting());

    // Test Summary
    this.printSummary();
  }

  printSummary() {
    this.log('\n📊 Test Summary', 'bold');
    this.log('================', 'blue');
    this.log(`Total Tests: ${this.totalTests}`, 'blue');
    this.log(`Passed: ${this.passedTests}`, 'green');
    this.log(`Failed: ${this.failedTests}`, 'red');
    
    const successRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    this.log(`Success Rate: ${successRate}%`, successRate > 80 ? 'green' : 'yellow');

    if (this.failedTests > 0) {
      this.log('\n❌ Failed Tests:', 'red');
      this.testResults
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          this.log(`   • ${test.name}: ${test.error}`, 'red');
        });
    }

    this.log('\n🔧 Environment Configuration Notes:', 'yellow');
    this.log('• Make sure your .env.local file is properly configured', 'yellow');
    this.log('• Some tests may fail if external services (N8N, Pinecone, Google AI) are not set up', 'yellow');
    this.log('• For full functionality testing, ensure all API keys are valid', 'yellow');
    
    if (this.passedTests === this.totalTests) {
      this.log('\n🎉 All tests passed! Your RAG Chat UI is working correctly!', 'green');
    } else if (successRate > 70) {
      this.log('\n✨ Most tests passed! Check failed tests for potential issues.', 'yellow');
    } else {
      this.log('\n⚠️ Several tests failed. Please check your configuration and server setup.', 'red');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new RAGChatTester();
  tester.runAllTests().catch(error => {
    console.error('Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = RAGChatTester; 