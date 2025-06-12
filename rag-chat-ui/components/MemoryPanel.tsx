'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Edit2, Trash2, Check, Clock, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  sessionId: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

interface MemoryPanelProps {
  onSelectMemory?: (entry: any) => void;
  onNewChat?: () => void;
  onAddMemory?: (addMemoryFn: (question: string, answer: string, sources?: string[]) => void) => void;
  onSelectConversation?: (conversationId: string) => void;
  currentConversationId?: string;
  conversationChangeCounter?: number;
}

export default function MemoryPanel({ 
  onNewChat, 
  onSelectConversation, 
  currentConversationId, 
  conversationChangeCounter 
}: MemoryPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false); // Start expanded like ChatGPT
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [, setIsLoading] = useState(false);

  // Load conversations from persistent storage
  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversations(data.conversations.map((conv: { id: string; title: string; sessionId: string; userId?: string; createdAt: string; updatedAt: string }) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt)
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Refresh conversations when conversation changes (from parent)
  useEffect(() => {
    if (conversationChangeCounter !== undefined) {
      loadConversations();
    }
  }, [conversationChangeCounter]);

  // Auto-refresh conversations every 30 seconds when panel is open
  useEffect(() => {
    if (!isCollapsed) {
      const interval = setInterval(() => {
        loadConversations();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isCollapsed]);

  // Delete a conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations?conversationId=${conversationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Refresh conversations list
        await loadConversations();
        
        // If this was the current conversation, clear it
        if (conversationId === currentConversationId) {
          onNewChat?.();
        }
      } else {
        console.error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Start editing conversation title
  const startEditingTitle = (conversationId: string, currentTitle: string) => {
    setEditingConversation(conversationId);
    setEditTitle(currentTitle);
  };

  // Save edited title
  const saveEditedTitle = async (conversationId: string) => {
    if (!editTitle.trim()) return;
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          title: editTitle.trim()
        })
      });
      
      if (response.ok) {
        // Refresh conversations list
        await loadConversations();
        setEditingConversation(null);
        setEditTitle('');
      } else {
        console.error('Failed to update conversation title');
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingConversation(null);
    setEditTitle('');
  };

  // Handle new chat
  const handleNewChat = () => {
    onNewChat?.();
  };

  // Close sidebar
  const closeSidebar = () => {
    setIsCollapsed(true);
  };

  const panelVariants = {
    collapsed: { 
      width: 48,
      transition: { 
        type: "spring", 
        stiffness: 300,
        damping: 30
      }
    },
    expanded: { 
      width: 320,
      transition: { 
        type: "spring", 
        stiffness: 300,
        damping: 30
      }
    }
  };

  const memoryItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (custom: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.3,
        ease: "easeOut"
      }
    }),
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  };

  return (
    <>
      {/* Toggle Button */}
      {isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-4 left-4 z-50"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 p-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-lg"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Memory Panel */}
      <motion.div
        variants={panelVariants}
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        className="h-full border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden shadow-xl"
      >
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Chat History
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {conversations.length}
                    </Badge>
                    {/* Close Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeSidebar}
                      className="w-6 h-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                      title="Close sidebar"
                    >
                      <X className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  All conversations
                </p>
                
                {/* New Chat Button */}
                <Button
                  onClick={handleNewChat}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  size="sm"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </div>

              {/* Content List */}
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                  <AnimatePresence>
                    {/* Conversations View */}
                    {conversations.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8"
                      >
                        <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No conversations yet
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Start chatting to save conversations
                        </p>
                      </motion.div>
                    ) : (
                      conversations.map((conversation, index) => (
                        <motion.div
                          key={conversation.id}
                          custom={index}
                          variants={memoryItemVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover="hover"
                          className={cn(
                            "cursor-pointer rounded-lg border transition-all duration-200 group",
                            currentConversationId === conversation.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                          )}
                          onClick={() => onSelectConversation?.(conversation.id)}
                        >
                          <Card className="border-0 shadow-none bg-transparent">
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  {editingConversation === conversation.id ? (
                                    <div className="flex-1 flex gap-1">
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            saveEditedTitle(conversation.id);
                                          } else if (e.key === 'Escape') {
                                            cancelEditing();
                                          }
                                        }}
                                        className="flex-1 text-sm bg-transparent border-b border-blue-500 focus:outline-none"
                                        autoFocus
                                      />
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 text-green-600 hover:text-green-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            saveEditedTitle(conversation.id);
                                          }}
                                        >
                                          <Check className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            cancelEditing();
                                          }}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 flex-1">
                                        {conversation.title}
                                      </p>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 text-slate-500 hover:text-slate-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditingTitle(conversation.id, conversation.title);
                                          }}
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteConversation(conversation.id);
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      {new Date(conversation.updatedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{conversation.messageCount} messages</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
} 