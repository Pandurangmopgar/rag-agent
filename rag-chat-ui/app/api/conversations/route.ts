import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider, generateConversationTitle } from '@/lib/storage';

// GET /api/conversations - Get all conversations for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const storage = getStorageProvider();
    const conversations = await storage.getConversations(userId || undefined);
    
    return NextResponse.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Failed to get conversations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve conversations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, title, userId, firstMessage } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    
    // Generate title from first message if not provided
    const conversationTitle = title || generateConversationTitle(firstMessage || 'New Conversation');
    
    const conversation = await storage.createConversation(sessionId, conversationTitle, userId);
    
    return NextResponse.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/conversations - Update a conversation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, title, userId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    
    // Verify ownership if userId is provided
    if (userId) {
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || (conversation.userId && conversation.userId !== userId)) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found or access denied' },
          { status: 404 }
        );
      }
    }
    
    const updates: Record<string, unknown> = {};
    if (title) updates.title = title;
    
    await storage.updateConversation(conversationId, updates);
    
    return NextResponse.json({
      success: true,
      message: 'Conversation updated successfully'
    });
  } catch (error) {
    console.error('Failed to update conversation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations - Delete a conversation
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
    
    // Verify ownership if userId is provided
    if (userId) {
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || (conversation.userId && conversation.userId !== userId)) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found or access denied' },
          { status: 404 }
        );
      }
    }
    
    await storage.deleteConversation(conversationId);
    
    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 