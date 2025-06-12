'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, Moon, Sun, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import ChatBox from '@/components/ChatBox';
import MemoryPanel from '@/components/MemoryPanel';

interface MemoryEntry {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  sources?: string[];
}

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [, setSelectedMemory] = useState<MemoryEntry | null>(null);
  const [chatKey, setChatKey] = useState(0); // Key to force re-render of ChatBox
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationChangeCounter, setConversationChangeCounter] = useState(0); // Trigger for conversation refresh
  const addMemoryRef = useRef<((question: string, answer: string, sources?: string[]) => void) | null>(null);

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const logoVariants = {
    hover: { 
      scale: 1.05,
      rotate: [0, -5, 5, 0],
      transition: { 
        duration: 0.5,
        ease: "easeInOut"
      }
    }
  };

  // Handle new chat - this will clear the chat and reset state
  const handleNewChat = () => {
    // Clear selected memory
    setSelectedMemory(null);
    
    // Clear current conversation
    setCurrentConversationId(null);
    
    // Force re-render of ChatBox by changing key
    setChatKey(prev => prev + 1);
    
    // Also clear via window method as backup
    if ((window as unknown as Record<string, unknown>).clearChatMessages) {
      ((window as unknown as Record<string, unknown>).clearChatMessages as () => void)();
    }
  };

  // Handle conversation selection from MemoryPanel
  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setSelectedMemory(null); // Clear any selected legacy memory
  };

  // Handle conversation creation from ChatBox
  const handleCreateConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    // Trigger conversation list refresh
    setConversationChangeCounter(prev => prev + 1);
  };

  // Handle memory addition from ChatBox
  const handleAddMemory = (addMemoryFn: (question: string, answer: string, sources?: string[]) => void) => {
    addMemoryRef.current = addMemoryFn;
  };

  // Handle memory selection
  const handleSelectMemory = (memory: MemoryEntry) => {
    setSelectedMemory(memory);
    // You could potentially pre-fill the chat input with the selected question
    // or display the conversation in some way
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Memory Panel */}
      <MemoryPanel 
        onSelectMemory={handleSelectMemory}
        onNewChat={handleNewChat}
        onAddMemory={handleAddMemory}
        onSelectConversation={handleSelectConversation}
        currentConversationId={currentConversationId || undefined}
        conversationChangeCounter={conversationChangeCounter}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.header
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              {/* Logo & Title */}
              <motion.div
                variants={logoVariants}
                whileHover="hover"
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 180, 360]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Sparkles className="w-2 h-2 text-white" />
                  </motion.div>
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                    RAG Chat Assistant
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Powered by AI & Vector Search
                  </p>
                </div>
              </motion.div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Stats */}
                <div className="hidden md:flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span>Online</span>
                  </div>
                  <div className="text-slate-400 dark:text-slate-500">|</div>
                  <div>v2.0.0</div>
                </div>

                {/* Theme Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-9 h-9 p-0 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-700" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Chat Interface */}
        <main className="flex-1 overflow-hidden">
          <ChatBox 
            key={chatKey}
            onAddMemory={addMemoryRef.current || undefined}
            conversationId={currentConversationId || undefined}
            onCreateConversation={handleCreateConversation}
            onMessageSent={() => setConversationChangeCounter(prev => prev + 1)}
          />
        </main>
      </div>
    </div>
  );
}
