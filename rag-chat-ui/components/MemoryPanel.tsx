'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, FolderClosed, Clock, MessageSquare, X, ChevronLeft, ChevronRight, Trash2, Edit2, ImageIcon, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Conversation } from '@/lib/storage';

interface MemoryEntry {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  sources?: string[];
}

interface MemoryPanelProps {
  onSelectMemory?: (entry: MemoryEntry) => void;
  onNewChat?: () => void;
  onAddMemory?: (addMemoryFn: (question: string, answer: string, sources?: string[]) => void) => void;
  onSelectConversation?: (conversationId: string) => void;
  currentConversationId?: string;
}

export default function MemoryPanel({ onSelectMemory, onNewChat, onAddMemory, onSelectConversation, currentConversationId }: MemoryPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'conversations' | 'memories'>('conversations');

  // Load conversations from persistent storage
  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversations(data.conversations.map((conv: any) => ({
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

  // Load conversations on mount and when view changes
  useEffect(() => {
    if (view === 'conversations') {
      loadConversations();
    }
  }, [view]);

  // Load memories from localStorage on mount (fallback for legacy support)
  useEffect(() => {
    if (view === 'memories' && typeof window !== 'undefined') {
      const savedMemories = localStorage.getItem('rag-chat-memories');
      if (savedMemories) {
        try {
          const parsed = JSON.parse(savedMemories);
          setMemories(parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        } catch (error) {
          console.error('Failed to load memories:', error);
        }
      }
    }
  }, [view]);

  // Save memories to localStorage
  const saveMemories = (newMemories: MemoryEntry[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rag-chat-memories', JSON.stringify(newMemories));
    }
    setMemories(newMemories);
  };

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

  // Add new memory entry
  const addMemory = (question: string, answer: string, sources?: string[]) => {
    const newMemory: MemoryEntry = {
      id: Date.now().toString(),
      question,
      answer,
      timestamp: new Date(),
      sources
    };

    const updatedMemories = [newMemory, ...memories].slice(0, 5); // Keep only last 5
    saveMemories(updatedMemories);
  };

  // Expose addMemory function to parent component
  useEffect(() => {
    onAddMemory?.(addMemory);
  }, [onAddMemory]);

  // Handle memory selection
  const handleSelectMemory = (memory: MemoryEntry) => {
    setSelectedMemory(memory.id);
    onSelectMemory?.(memory);
  };

  // Handle new chat
  const handleNewChat = () => {
    setSelectedMemory(null);
    onNewChat?.();
  };

  // Clear all memories
  const clearMemories = () => {
    saveMemories([]);
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

  const contentVariants = {
    collapsed: { 
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 }
    },
    expanded: { 
      opacity: 1,
      x: 0,
      transition: { 
        duration: 0.3,
        delay: 0.1
      }
    }
  };

  const memoryItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: index * 0.1,
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    }),
    hover: {
      scale: 1.02,
      backgroundColor: "rgba(59, 130, 246, 0.05)",
      transition: { duration: 0.2 }
    }
  };

  const toggleButtonVariants = {
    collapsed: { rotate: 0 },
    expanded: { rotate: 180 }
  };

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsCollapsed(true)}
          />
        )}
      </AnimatePresence>

      {/* Memory Panel */}
      <motion.div
        variants={panelVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        className={cn(
          "relative h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-lg z-50",
          "flex flex-col overflow-hidden"
        )}
      >
        {/* Toggle Button */}
        <div className="absolute -right-6 top-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-6 h-8 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <motion.div
              variants={toggleButtonVariants}
              animate={isCollapsed ? "collapsed" : "expanded"}
            >
              <ChevronRight className="w-3 h-3" />
            </motion.div>
          </Button>
        </div>

        {/* Collapsed State - Icon Only */}
        <AnimatePresence>
          {isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-2 h-full"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
                onClick={() => setIsCollapsed(false)}
              >
                <FolderClosed className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </motion.div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                Memory
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded State - Full Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Chat History
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {view === 'conversations' ? conversations.length : memories.length}
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

                {/* View Toggle */}
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-3">
                  <Button
                    variant={view === 'conversations' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setView('conversations')}
                    className="flex-1 text-xs h-7"
                  >
                    Conversations
                  </Button>
                  <Button
                    variant={view === 'memories' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setView('memories')}
                    className="flex-1 text-xs h-7"
                  >
                    Legacy
                  </Button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {view === 'conversations' ? 'All conversations' : 'Recent Q&A pairs'}
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
                    {view === 'conversations' ? (
                      // Conversations View
                      conversations.length === 0 ? (
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
                      )
                    ) : (
                      // Legacy Memories View
                      memories.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-8"
                        >
                          <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No memories yet
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Start chatting to save Q&A pairs
                          </p>
                        </motion.div>
                      ) : (
                        memories.map((memory, index) => (
                          <motion.div
                            key={memory.id}
                            custom={index}
                            variants={memoryItemVariants}
                            initial="hidden"
                            animate="visible"
                            whileHover="hover"
                            className={cn(
                              "cursor-pointer rounded-lg border transition-all duration-200",
                              selectedMemory === memory.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                            )}
                            onClick={() => handleSelectMemory(memory)}
                          >
                            <Card className="border-0 shadow-none bg-transparent">
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                                      {memory.question}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {memory.timestamp.toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                    {memory.answer}
                                  </p>
                                  
                                  {memory.sources && memory.sources.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {memory.sources.slice(0, 2).map((source, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="outline"
                                          className="text-xs px-1 py-0 h-4"
                                        >
                                          {source}
                                        </Badge>
                                      ))}
                                      {memory.sources.length > 2 && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs px-1 py-0 h-4"
                                        >
                                          +{memory.sources.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))
                      )
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              {/* Footer Actions */}
              {memories.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border-t border-slate-200 dark:border-slate-700"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearMemories}
                    className="w-full text-xs hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
} 