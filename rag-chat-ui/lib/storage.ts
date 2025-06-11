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
    const updateData: any = {
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

// Upstash Redis Implementation
class UpstashStorage implements StorageProvider {
  private redis;

  constructor() {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis environment variables are required');
    }

    // We'll use fetch to make HTTP requests to Upstash Redis REST API
    this.redis = {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    };
  }

  private async redisCommand(command: string[]): Promise<any> {
    const response = await fetch(`${this.redis.url}/${command.join('/')}`, {
      headers: {
        Authorization: `Bearer ${this.redis.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Redis command failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result;
  }

  async createConversation(sessionId: string, title: string, userId?: string): Promise<Conversation> {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation: Conversation = {
      id,
      userId,
      sessionId,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0
    };

    // Store conversation
    await this.redisCommand(['HSET', `conversation:${id}`, ...Object.entries({
      id,
      userId: userId || '',
      sessionId,
      title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: '0'
    }).flat()]);

    // Add to user's conversation list
    const userKey = userId ? `user:${userId}:conversations` : 'conversations';
    await this.redisCommand(['ZADD', userKey, id, Date.now().toString()]);

    return conversation;
  }

  async getConversations(userId?: string): Promise<Conversation[]> {
    const userKey = userId ? `user:${userId}:conversations` : 'conversations';
    const conversationIds = await this.redisCommand(['ZREVRANGE', userKey, '0', '-1']);
    
    if (!conversationIds || conversationIds.length === 0) return [];

    const conversations: Conversation[] = [];
    for (const id of conversationIds) {
      const convData = await this.redisCommand(['HGETALL', `conversation:${id}`]);
      if (convData && convData.length > 0) {
        const conv = this.parseHashToObject(convData);
        conversations.push({
          id: conv.id,
          userId: conv.userId || undefined,
          sessionId: conv.sessionId,
          title: conv.title,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messageCount: parseInt(conv.messageCount) || 0,
          lastMessage: conv.lastMessage
        });
      }
    }

    return conversations;
  }

  private parseHashToObject(hashArray: string[]): any {
    const obj: any = {};
    for (let i = 0; i < hashArray.length; i += 2) {
      obj[hashArray[i]] = hashArray[i + 1];
    }
    return obj;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const convData = await this.redisCommand(['HGETALL', `conversation:${conversationId}`]);
    if (!convData || convData.length === 0) return null;

    const conv = this.parseHashToObject(convData);
    return {
      id: conv.id,
      userId: conv.userId || undefined,
      sessionId: conv.sessionId,
      title: conv.title,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messageCount: parseInt(conv.messageCount) || 0,
      lastMessage: conv.lastMessage
    };
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    const updateData: string[] = ['updatedAt', new Date().toISOString()];
    
    if (updates.title) updateData.push('title', updates.title);
    if (updates.messageCount !== undefined) updateData.push('messageCount', updates.messageCount.toString());
    if (updates.lastMessage) updateData.push('lastMessage', updates.lastMessage);

    await this.redisCommand(['HSET', `conversation:${conversationId}`, ...updateData]);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // Get conversation to find userId
    const conv = await this.getConversation(conversationId);
    if (!conv) return;

    // Delete messages
    await this.deleteMessages(conversationId);

    // Remove from user's conversation list
    const userKey = conv.userId ? `user:${conv.userId}:conversations` : 'conversations';
    await this.redisCommand(['ZREM', userKey, conversationId]);

    // Delete conversation
    await this.redisCommand(['DEL', `conversation:${conversationId}`]);
  }

  async addMessage(conversationId: string, message: Omit<Message, 'id' | 'conversationId'>): Promise<Message> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData: Message = {
      id,
      conversationId,
      ...message
    };

    // Store message
    await this.redisCommand(['HSET', `message:${id}`, ...Object.entries({
      id,
      conversationId,
      content: message.content,
      role: message.role,
      timestamp: message.timestamp.toISOString(),
      sources: JSON.stringify(message.sources || []),
      image: message.image || '',
      imageType: message.imageType || '',
      cached: message.cached ? 'true' : 'false'
    }).flat()]);
    // Add to conversation's message list
    await this.redisCommand(['ZADD', `conversation:${conversationId}:messages`, message.timestamp.getTime().toString(), id]);

    // Update conversation
    const messageCount = await this.redisCommand(['ZCARD', `conversation:${conversationId}:messages`]);
    await this.updateConversation(conversationId, {
      messageCount,
      lastMessage: message.content.substring(0, 100)
    });

    return messageData;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const messageIds = await this.redisCommand(['ZRANGE', `conversation:${conversationId}:messages`, '0', '-1']);
    if (!messageIds || messageIds.length === 0) return [];

    const messages: Message[] = [];
    for (const id of messageIds) {
      const msgData = await this.redisCommand(['HGETALL', `message:${id}`]);
      if (msgData && msgData.length > 0) {
        const msg = this.parseHashToObject(msgData);
        messages.push({
          id: msg.id,
          conversationId: msg.conversationId,
          content: msg.content,
          role: msg.role,
          timestamp: new Date(msg.timestamp),
          sources: JSON.parse(msg.sources || '[]'),
          image: msg.image || undefined,
          imageType: msg.imageType || undefined,
          cached: msg.cached === 'true'
        });
      }
    }

    return messages;
  }

  async deleteMessages(conversationId: string): Promise<void> {
    const messageIds = await this.redisCommand(['ZRANGE', `conversation:${conversationId}:messages`, '0', '-1']);
    if (messageIds && messageIds.length > 0) {
      // Delete individual messages
      for (const id of messageIds) {
        await this.redisCommand(['DEL', `message:${id}`]);
      }
    }
    // Delete message list
    await this.redisCommand(['DEL', `conversation:${conversationId}:messages`]);
  }

  async getCachedResponse(query: string): Promise<CachedResponse | null> {
    const cacheKey = `cache:${Buffer.from(query).toString('base64')}`;
    const cachedData = await this.redisCommand(['HGETALL', cacheKey]);
    
    if (!cachedData || cachedData.length === 0) return null;

    const cache = this.parseHashToObject(cachedData);
    const expiresAt = new Date(cache.expiresAt);
    
    if (expiresAt < new Date()) {
      // Expired, delete it
      await this.redisCommand(['DEL', cacheKey]);
      return null;
    }

    return {
      id: cache.id,
      query: cache.query,
      response: cache.response,
      sources: JSON.parse(cache.sources || '[]'),
      createdAt: new Date(cache.createdAt),
      expiresAt
    };
  }

  async setCachedResponse(query: string, response: string, sources?: string[], ttlMinutes = 60): Promise<void> {
    const cacheKey = `cache:${Buffer.from(query).toString('base64')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);

    await this.redisCommand(['HSET', cacheKey, ...Object.entries({
      id: `cache_${Date.now()}`,
      query,
      response,
      sources: JSON.stringify(sources || []),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    }).flat()]);
    // Set TTL
    await this.redisCommand(['EXPIRE', cacheKey, (ttlMinutes * 60).toString()]);
  }

  async clearExpiredCache(): Promise<void> {
    // Redis will automatically expire keys with TTL, so this is a no-op
    // But we could scan for cache keys and check their expiry if needed
  }
}

// Factory function to get the appropriate storage provider
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'supabase';
  
  switch (provider) {
    case 'supabase':
      return new SupabaseStorage();
    case 'upstash':
      return new UpstashStorage();
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
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