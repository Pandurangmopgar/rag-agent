import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider, createCacheKey } from '@/lib/storage';

// GET /api/messages - Get messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId');

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    
    // Verify conversation access if userId is provided
    if (userId) {
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || (conversation.userId && conversation.userId !== userId)) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found or access denied' },
          { status: 404 }
        );
      }
    }
    
    const messages = await storage.getMessages(conversationId);
    
    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Failed to get messages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/messages - Add a new message to a conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      conversationId, 
      content, 
      role, 
      sources, 
      image, 
      imageType, 
      userId,
      enableCaching = true 
    } = body;

    if (!conversationId || !content || !role) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID, content, and role are required' },
        { status: 400 }
      );
    }

    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role must be either "user" or "assistant"' },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    
    // Verify conversation access if userId is provided
    if (userId) {
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || (conversation.userId && conversation.userId !== userId)) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Check for cached response if this is a user message and caching is enabled
    let cachedResponse = null;
    if (role === 'user' && enableCaching) {
      const cacheKey = createCacheKey(content, !!image);
      cachedResponse = await storage.getCachedResponse(cacheKey);
    }

    // Add the user message
    const message = await storage.addMessage(conversationId, {
      content,
      role,
      timestamp: new Date(),
      sources,
      image,
      imageType,
      cached: !!cachedResponse
    });

    let assistantMessage = null;
    
    // If we have a cached response and this is a user message, add the cached assistant response
    if (cachedResponse && role === 'user') {
      assistantMessage = await storage.addMessage(conversationId, {
        content: cachedResponse.response,
        role: 'assistant',
        timestamp: new Date(),
        sources: cachedResponse.sources,
        cached: true
      });
    }

    return NextResponse.json({
      success: true,
      message,
      assistantMessage,
      cached: !!cachedResponse
    });
  } catch (error) {
    console.error('Failed to add message:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/messages - Delete all messages in a conversation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId');

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    
    // Verify conversation access if userId is provided
    if (userId) {
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || (conversation.userId && conversation.userId !== userId)) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found or access denied' },
          { status: 404 }
        );
      }
    }
    
    await storage.deleteMessages(conversationId);
    
    return NextResponse.json({
      success: true,
      message: 'Messages deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete messages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 