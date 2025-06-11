import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getStorageProvider, createCacheKey } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, sessionId, conversationId, enableCaching = true } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required and must be a string' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL) {
      return NextResponse.json(
        { error: 'N8N webhook URL is not configured' },
        { status: 500 }
      );
    }

    const storage = getStorageProvider();
    let cachedResponse = null;

    // Check for cached response if caching is enabled
    if (enableCaching) {
      const cacheKey = createCacheKey(question, false);
      cachedResponse = await storage.getCachedResponse(cacheKey);
      
      if (cachedResponse) {
        console.log('🎯 Cache hit for question:', question);
        
        // Store this cached interaction if conversationId is provided
        if (conversationId) {
          await storage.addMessage(conversationId, {
            content: question,
            role: 'user',
            timestamp: new Date(),
            cached: true
          });
          
          await storage.addMessage(conversationId, {
            content: cachedResponse.response,
            role: 'assistant',
            timestamp: new Date(),
            sources: cachedResponse.sources,
            cached: true
          });
        }
        
        return NextResponse.json({
          answer: cachedResponse.response,
          sources: cachedResponse.sources,
          cached: true
        });
      }
    }

    console.log('🔍 Sending request to N8N:', {
      url: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL,
      question: question,
      sessionId: sessionId
    });

    const response = await axios.post(
      process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL,
      { 
        question,
        sessionId
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    console.log('✅ N8N Response received:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    // Handle different response formats from N8N
    let formattedResponse;
    
    if (response.data) {
      // If response.data is already in the expected format
      if (response.data.answer) {
        formattedResponse = {
          answer: response.data.answer,
          sources: response.data.sources || []
        };
      }
      // If response.data is a string (direct answer)
      else if (typeof response.data === 'string') {
        formattedResponse = {
          answer: response.data,
          sources: []
        };
      }
      // If response.data has a different structure, try to extract the answer
      else if (response.data.result) {
        formattedResponse = {
          answer: response.data.result,
          sources: response.data.sources || []
        };
      }
      // If response.data has a message field
      else if (response.data.message) {
        formattedResponse = {
          answer: response.data.message,
          sources: response.data.sources || []
        };
      }
      // If response.data is an array, take the first item
      else if (Array.isArray(response.data) && response.data.length > 0) {
        const firstItem = response.data[0];
        formattedResponse = {
          answer: firstItem.answer || firstItem.result || firstItem.message || JSON.stringify(firstItem),
          sources: firstItem.sources || []
        };
      }
      // Fallback: stringify the entire response
      else {
        formattedResponse = {
          answer: JSON.stringify(response.data, null, 2),
          sources: []
        };
      }
    } else {
      formattedResponse = {
        answer: 'I received a response, but it was empty.',
        sources: []
      };
    }

    console.log('📤 Formatted response:', formattedResponse);

    // Cache the response if caching is enabled
    if (enableCaching && formattedResponse.answer) {
      try {
        const cacheKey = createCacheKey(question, false);
        await storage.setCachedResponse(
          cacheKey, 
          formattedResponse.answer, 
          formattedResponse.sources, 
          60 // Cache for 60 minutes
        );
        console.log('💾 Response cached for question:', question);
      } catch (cacheError) {
        console.error('⚠️ Failed to cache response:', cacheError);
        // Don't fail the request if caching fails
      }
    }

    // Store the conversation if conversationId is provided
    if (conversationId) {
      try {
        // Add user message
        await storage.addMessage(conversationId, {
          content: question,
          role: 'user',
          timestamp: new Date(),
          cached: false
        });

        // Add assistant response
        await storage.addMessage(conversationId, {
          content: formattedResponse.answer,
          role: 'assistant',
          timestamp: new Date(),
          sources: formattedResponse.sources,
          cached: false
        });
        
        console.log('💬 Conversation stored for session:', sessionId);
      } catch (storageError) {
        console.error('⚠️ Failed to store conversation:', storageError);
        // Don't fail the request if storage fails
      }
    }

    return NextResponse.json({
      ...formattedResponse,
      cached: false
    });
  } catch (error) {
    console.error('❌ Error in ask API:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('📋 Axios error details:', {
        code: error.code,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      if (error.code === 'ECONNABORTED') {
        return NextResponse.json(
          { error: 'Request timeout - the AI service took too long to respond' },
          { status: 408 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to get response from AI service' },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 