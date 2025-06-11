import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider, createCacheKey } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, image, imageType, sessionId, conversationId, enableCaching = true } = body;

    if (!image || !imageType) {
      return NextResponse.json(
        { error: 'Image and imageType are required' },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GOOGLE_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    const storage = getStorageProvider();
    let cachedResponse = null;

    // Check for cached response if caching is enabled
    // For images, we create a cache key combining the question and a hash of the image
    if (enableCaching) {
      const imageHash = image.substring(0, 50); // Use first 50 chars of base64 as simple hash
      const cacheKey = createCacheKey(`${question}_${imageHash}`, true);
      cachedResponse = await storage.getCachedResponse(cacheKey);
      
      if (cachedResponse) {
        console.log('🎯 Cache hit for image analysis:', question);
        
        // Store this cached interaction if conversationId is provided
        if (conversationId) {
          await storage.addMessage(conversationId, {
            content: question || 'Please analyze this image and describe what you see in detail.',
            role: 'user',
            timestamp: new Date(),
            image,
            imageType,
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
          sessionId: sessionId || `session_${Date.now()}`,
          isMultimodal: true,
          processingType: 'vision',
          cached: true
        });
      }
    }

    const payload = {
      contents: [{
        parts: [
          {
            text: question || 'Please analyze this image and describe what you see in detail.'
          },
          {
            inline_data: {
              mime_type: imageType,
              data: image
            }
          }
        ]
      }],
      generationConfig: {
        responseModalities: ["Text"],
        temperature: 0.7,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048
      }
    };

    console.log('🖼️ Sending image analysis request to Gemini 2.0 Flash:', {
      hasImage: true,
      imageType,
      questionLength: question?.length || 0,
      sessionId
    });

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Gemini API error:', response.status, errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();

    // Extract the generated text
    let answer = 'I apologize, but I could not analyze the image.';
    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        answer = candidate.content.parts[0].text || answer;
      }
    }

    console.log('✅ Image analysis completed successfully');

    // Cache the response if caching is enabled
    if (enableCaching && answer && answer !== 'I apologize, but I could not analyze the image.') {
      try {
        const imageHash = image.substring(0, 50);
        const cacheKey = createCacheKey(`${question}_${imageHash}`, true);
        await storage.setCachedResponse(
          cacheKey, 
          answer, 
          ['Gemini 2.0 Flash Vision Analysis'], 
          60 // Cache for 60 minutes
        );
        console.log('💾 Image analysis response cached');
      } catch (cacheError) {
        console.error('⚠️ Failed to cache image analysis response:', cacheError);
        // Don't fail the request if caching fails
      }
    }

    // Store the conversation if conversationId is provided
    if (conversationId) {
      try {
        // Add user message with image
        await storage.addMessage(conversationId, {
          content: question || 'Please analyze this image and describe what you see in detail.',
          role: 'user',
          timestamp: new Date(),
          image,
          imageType,
          cached: false
        });

        // Add assistant response
        await storage.addMessage(conversationId, {
          content: answer,
          role: 'assistant',
          timestamp: new Date(),
          sources: ['Gemini 2.0 Flash Vision Analysis'],
          cached: false
        });
        
        console.log('💬 Image analysis conversation stored for session:', sessionId);
      } catch (storageError) {
        console.error('⚠️ Failed to store image analysis conversation:', storageError);
        // Don't fail the request if storage fails
      }
    }

    return NextResponse.json({
      answer: answer,
      sources: ['Gemini 2.0 Flash Vision Analysis'],
      sessionId: sessionId || `session_${Date.now()}`,
      isMultimodal: true,
      processingType: 'vision',
      cached: false
    });

  } catch (error) {
    console.error('❌ Error in image analysis API:', error);
    
    // Try to get sessionId from request if available
    let fallbackSessionId = `session_${Date.now()}`;
    try {
      const body = await request.json();
      fallbackSessionId = body?.sessionId || fallbackSessionId;
    } catch {
      // If we can't parse the body, use the generated session ID
    }
    
    return NextResponse.json({
      answer: 'I apologize, but I encountered an error analyzing the image. Please try again.',
      sources: [],
      sessionId: fallbackSessionId,
      isMultimodal: true,
      processingType: 'vision_error'
    }, { status: 500 });
  }
} 