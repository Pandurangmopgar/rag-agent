import { createClient } from '@supabase/supabase-js';

// Types
export interface Conversation {
  id: string;
  userId?: string;
  sessionId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: string[];
  image?: string;
  imageType?: string;
  cached?: boolean;
}

export interface CachedResponse {
  id: string;
  query: string;
  response: string;
  sources?: string[];
  createdAt: Date;
  expiresAt: Date;
}

// Storage Interface
interface StorageProvider {
  // Conversations
  createConversation(sessionId: string, title: string, userId?: string): Promise<Conversation>;
  getConversations(userId?: string): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<Conversation | null>;
  updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void>;
  deleteConversation(conversationId: string): Promise<void>;

  // Messages
  addMessage(conversationId: string, message: Omit<Message, 'id' | 'conversationId'>): Promise<Message>;
  getMessages(conversationId: string): Promise<Message[]>;
  deleteMessages(conversationId: string): Promise<void>;

  // Caching
  getCachedResponse(query: string): Promise<CachedResponse | null>;
  setCachedResponse(query: string, response: string, sources?: string[], ttlMinutes?: number): Promise<void>;
  clearExpiredCache(): Promise<void>;
}

// Supabase Implementation
class SupabaseStorage implements StorageProvider {
  private supabase;

  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables are required');
    }
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  async createConversation(sessionId: string, title: string, userId?: string): Promise<Conversation> {
    const conversation = {
      session_id: sessionId,
      user_id: userId,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0
    };

    const { data, error } = await this.supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);

    return {
      id: data.id,
      userId: data.user_id,
      sessionId: data.session_id,
      title: data.title,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      messageCount: data.message_count,
      lastMessage: data.last_message
    };
  }

  async getConversations(userId?: string): Promise<Conversation[]> {
    let query = this.supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get conversations: ${error.message}`);

    return data.map(conv => ({
      id: conv.id,
      userId: conv.user_id,
      sessionId: conv.session_id,
      title: conv.title,
      createdAt: new Date(conv.created_at),
      updatedAt: new Date(conv.updated_at),
      messageCount: conv.message_count,
      lastMessage: conv.last_message
    }));
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      sessionId: data.session_id,
      title: data.title,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      messageCount: data.message_count,
      lastMessage: data.last_message
    };
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (updates.title) updateData.title = updates.title;
    if (updates.messageCount !== undefined) updateData.message_count = updates.messageCount;
    if (updates.lastMessage) updateData.last_message = updates.lastMessage;

    const { error } = await this.supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId);

    if (error) throw new Error(`Failed to update conversation: ${error.message}`);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // First delete all messages
    await this.deleteMessages(conversationId);
    
    // Then delete the conversation
    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
  }

  async addMessage(conversationId: string, message: Omit<Message, 'id' | 'conversationId'>): Promise<Message> {
    const messageData = {
      conversation_id: conversationId,
      content: message.content,
      role: message.role,
      timestamp: message.timestamp.toISOString(),
      sources: message.sources,
      image: message.image,
      image_type: message.imageType,
      cached: message.cached || false
    };

    const { data, error } = await this.supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw new Error(`Failed to add message: ${error.message}`);

    // Update conversation message count and last message
    await this.supabase
      .from('conversations')
      .update({
        message_count: await this.getMessageCount(conversationId),
        last_message: message.content.substring(0, 100),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return {
      id: data.id,
      conversationId: data.conversation_id,
      content: data.content,
      role: data.role,
      timestamp: new Date(data.timestamp),
      sources: data.sources,
      image: data.image,
      imageType: data.image_type,
      cached: data.cached
    };
  }

  private async getMessageCount(conversationId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (error) return 0;
    return count || 0;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) throw new Error(`Failed to get messages: ${error.message}`);

    return data.map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      content: msg.content,
      role: msg.role,
      timestamp: new Date(msg.timestamp),
      sources: msg.sources,
      image: msg.image,
      imageType: msg.image_type,
      cached: msg.cached
    }));
  }

  async deleteMessages(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) throw new Error(`Failed to delete messages: ${error.message}`);
  }

  async getCachedResponse(query: string): Promise<CachedResponse | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('cached_responses')
      .select('*')
      .eq('query', query)
      .gt('expires_at', now)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get cached response: ${error.message}`);
    }

    return {
      id: data.id,
      query: data.query,
      response: data.response,
      sources: data.sources,
      createdAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at)
    };
  }

  async setCachedResponse(query: string, response: string, sources?: string[], ttlMinutes = 60): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);

    const { error } = await this.supabase
      .from('cached_responses')
      .upsert({
        query,
        response,
        sources,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'query'
      });

    if (error) throw new Error(`Failed to cache response: ${error.message}`);
  }

  async clearExpiredCache(): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from('cached_responses')
      .delete()
      .lt('expires_at', now);

    if (error) throw new Error(`Failed to clear expired cache: ${error.message}`);
  }
}

/* 
// Upstash Redis Implementation (commented out due to TypeScript complexity)
class UpstashStorage implements StorageProvider {
  // Implementation would go here but requires complex type handling
  // for Redis command responses. Currently using Supabase only.
}
*/

// Factory function to get the appropriate storage provider
export function getStorageProvider(): StorageProvider {
  // Currently only Supabase is supported
  return new SupabaseStorage();
}

// Utility functions
export function generateConversationTitle(firstMessage: string): string {
  const title = firstMessage.length > 50 
    ? firstMessage.substring(0, 50) + '...'
    : firstMessage;
  return title || 'New Conversation';
}

export function createCacheKey(query: string, hasImage: boolean = false): string {
  const prefix = hasImage ? 'img:' : 'txt:';
  return prefix + query.toLowerCase().trim();
} 