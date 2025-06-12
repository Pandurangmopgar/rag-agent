'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Bot, User, Loader2, Upload, CheckCircle, AlertCircle, Image as ImageIcon, X, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: string[];
  image?: string; // Base64 encoded image
  imageType?: string; // MIME type
}

interface UploadStatus {
  isUploading: boolean;
  progress: number;
  fileName?: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
}

interface ChatBoxProps {
  onAddMemory?: (question: string, answer: string, sources?: string[]) => void;
  onClearChat?: () => void;
  conversationId?: string;
  onCreateConversation?: (conversationId: string, title: string) => void;
  onMessageSent?: () => void; // Callback when a message is sent
}

export default function ChatBox({ onAddMemory, onClearChat, conversationId, onCreateConversation, onMessageSent }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageType, setSelectedImageType] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    status: 'idle'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Generate a unique session ID for this chat session
  const [sessionId] = useState(() => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      // Server-side: return a temporary session ID
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Client-side: Try to get existing session ID from localStorage
    const existingSessionId = localStorage.getItem('chatSessionId');
    if (existingSessionId) {
      return existingSessionId;
    }
    
    // Generate new session ID using timestamp + random string
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatSessionId', newSessionId);
    return newSessionId;
  });

  // Track when we're loading from props vs creating new conversation
  const [isLoadingFromProps, setIsLoadingFromProps] = useState(false);

  // Load messages from persistent storage when conversation changes
  useEffect(() => {
    if (currentConversationId && isLoadingFromProps) {
      loadConversationMessages(currentConversationId);
      setIsLoadingFromProps(false);
    }
  }, [currentConversationId, isLoadingFromProps]);

  // Update conversation ID when prop changes
  useEffect(() => {
    if (conversationId !== currentConversationId) {
      setIsLoadingFromProps(true); // Flag that we're loading from props
      setMessages([]); // Clear current messages when switching conversations
      setCurrentConversationId(conversationId || null);
    }
  }, [conversationId, currentConversationId]);

  const loadConversationMessages = async (convId: string) => {
    try {
      const response = await fetch(`/api/messages?conversationId=${convId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const loadedMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            timestamp: new Date(msg.timestamp),
            sources: msg.sources,
            image: msg.image,
            imageType: msg.imageType
          }));
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    }
  };

  const createNewConversation = async (firstMessage: string): Promise<string | null> => {
    try {
      const title = firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage;
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          title,
          firstMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onCreateConversation?.(data.conversation.id, data.conversation.title);
          return data.conversation.id;
        }
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
    return null;
  };

  // Listen for clear chat requests from parent
  useEffect(() => {
    if (onClearChat) {
      // This effect doesn't actually do anything - the parent will handle clearing
      // by remounting the component or through other means
    }
  }, [onClearChat]);



  const scrollToBottom = () => {
    const chatContainer = document.querySelector('.chat-messages-container');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Scroll to bottom when messages change, but only if user was near bottom
  const [isNearBottom, setIsNearBottom] = useState(true);
  
  // Check if user is near bottom of chat
  const checkIfNearBottom = () => {
    const chatContainer = document.querySelector('.chat-messages-container');
    if (chatContainer) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isNear = scrollHeight - scrollTop - clientHeight < 100; // Within 100px of bottom
      setIsNearBottom(isNear);
    }
  };

  // Simple scroll effect - only auto-scroll to bottom if user is near bottom
  useEffect(() => {
    if (isNearBottom && messages.length > 0) {
      // Simple delay to ensure DOM is updated, then scroll to bottom naturally
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isNearBottom]);

  // Add scroll event listener with throttling for better performance
  useEffect(() => {
    const chatContainer = document.querySelector('.chat-messages-container');
    if (chatContainer) {
      let timeoutId: NodeJS.Timeout;
      
      const throttledCheckIfNearBottom = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(checkIfNearBottom, 100);
      };
      
      chatContainer.addEventListener('scroll', throttledCheckIfNearBottom);
      
      // Initial check
      checkIfNearBottom();
      
      return () => {
        chatContainer.removeEventListener('scroll', throttledCheckIfNearBottom);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    // Store input and image data before clearing
    const currentInput = input.trim() || (selectedImage ? "I've uploaded an image. Can you analyze it?" : "");
    const imageData = selectedImage;
    const imageType = selectedImageType;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      role: 'user',
      timestamp: new Date(),
      image: imageData || undefined,
      imageType: imageType || undefined
    };

    // Add user message to chat immediately
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input field immediately so user can type next message
    setInput('');
    
    // Start loading state
    setIsLoading(true);
    
    // Clear image state for UI with a small delay for better UX
    // This allows users to see the image being "sent" before it disappears
    setTimeout(() => {
      setSelectedImage(null);
      setSelectedImageType(null);
    }, 300);

    // Create conversation if this is the first message
    let activeConversationId = currentConversationId;
    if (!activeConversationId) {
      activeConversationId = await createNewConversation(currentInput);
      if (activeConversationId) {
        setCurrentConversationId(activeConversationId);
      }
    }

    try {
      let response;
      
      if (imageData) {
        // Route image queries to the dedicated image analysis endpoint
        response = await fetch('/api/image-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMessage.content,
            image: imageData,
            imageType: imageType,
            sessionId: sessionId,
            conversationId: activeConversationId
          })
        });
      } else {
        // Route text queries to the existing document RAG endpoint
        response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMessage.content,
            sessionId: sessionId,
            conversationId: activeConversationId
          })
        });
      }

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.answer || 'I apologize, but I encountered an issue processing your request.',
          role: 'assistant',
          timestamp: new Date(),
          sources: data.sources
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Add to memory panel (legacy support)
        onAddMemory?.(userMessage.content, assistantMessage.content, assistantMessage.sources);
        
        // Notify parent that a message exchange is complete
        onMessageSent?.();
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear messages function (called from parent via new chat)
  const clearMessages = () => {
    // Generate new session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Only update localStorage in browser environment
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatSessionId', newSessionId);
    }
    
    // Clear messages and image
    setMessages([]);
    setSelectedImage(null);
    setSelectedImageType(null);
    setCurrentConversationId(null);
  };

  // Expose clearMessages function to parent
  useEffect(() => {
    (window as any).clearChatMessages = clearMessages;
    return () => {
      delete (window as any).clearChatMessages;
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP).');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Please upload an image smaller than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      // Remove the data URL prefix to get just the base64 data
      const base64Data = base64String.split(',')[1];
      setSelectedImage(base64Data);
      setSelectedImageType(file.type);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setSelectedImageType(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['.pdf', '.txt', '.md'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        status: 'error',
        message: 'Please upload a PDF, TXT, or MD file.'
      });
      return;
    }

    setUploadStatus({
      isUploading: true,
      progress: 0,
      status: 'uploading',
      fileName: file.name
    });

    const formData = new FormData();
    formData.append('document', file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadStatus(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 30, 90)
        }));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({
          isUploading: false,
          progress: 100,
          status: 'success',
          fileName: file.name,
          message: data.message
        });

        // Clear upload status after 3 seconds
        setTimeout(() => {
          setUploadStatus({
            isUploading: false,
            progress: 0,
            status: 'idle'
          });
        }, 3000);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    }
  };

  const typingVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        repeat: Infinity,
        duration: 1.5,
        ease: "easeInOut"
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const chatContainer = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = chatContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(isNearBottom);
  };

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Chat Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-hidden"
      >
        <div 
          className="chat-messages-container h-full overflow-y-auto px-4 py-6 space-y-6"
          onScroll={handleScroll}
        >
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className={cn(
                  "message-container flex gap-3 max-w-4xl",
                  message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {/* Avatar */}
                <motion.div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    message.role === 'user' 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600" 
                      : "bg-gradient-to-r from-emerald-500 to-teal-600"
                  )}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </motion.div>

                {/* Message Content */}
                <motion.div
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    message.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <Card className={cn(
                    "px-4 py-3 shadow-lg border-0",
                    message.role === 'user'
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  )}>
                    {/* Image Display */}
                    {message.image && (
                      <div className="mb-3">
                        <img
                          src={`data:${message.imageType};base64,${message.image}`}
                          alt="Uploaded image"
                          className="max-w-full max-h-64 rounded-lg object-contain"
                        />
                      </div>
                    )}
                    
                    {/* Text Content */}
                    {message.content && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </Card>
                  
                  {message.sources && message.sources.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-xs text-slate-500 dark:text-slate-400"
                    >
                      Sources: {message.sources.join(', ')}
                    </motion.div>
                  )}
                  
                  <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex gap-3 max-w-4xl mr-auto"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <Card className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <motion.div 
                    className="flex gap-1"
                    variants={typingVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  </motion.div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {!isNearBottom && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 right-6 z-10"
          >
            <Button
              onClick={() => {
                setIsNearBottom(true);
                scrollToBottom();
              }}
              className="rounded-full w-12 h-12 p-0 bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Image Preview */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <ImageIcon className={cn(
                  "w-4 h-4",
                  isLoading ? "text-orange-500 animate-pulse" : "text-blue-500"
                )} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {isLoading ? "Processing image..." : "Image ready to send:"}
                </span>
                {!isLoading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeSelectedImage}
                    className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="mt-2">
                <img
                  src={`data:${selectedImageType};base64,${selectedImage}`}
                  alt="Selected image"
                  className="max-h-32 rounded-lg object-contain border border-slate-200 dark:border-slate-600"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadStatus.status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 py-3 border-t border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-3 max-w-4xl mx-auto">
              {uploadStatus.status === 'uploading' && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              )}
              {uploadStatus.status === 'success' && (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              )}
              {uploadStatus.status === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {uploadStatus.fileName && `${uploadStatus.fileName} - `}
                  {uploadStatus.status === 'uploading' && 'Uploading...'}
                  {uploadStatus.status === 'success' && 'Upload complete!'}
                  {uploadStatus.status === 'error' && 'Upload failed'}
                </div>
                {uploadStatus.message && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {uploadStatus.message}
                  </div>
                )}
                {uploadStatus.isUploading && (
                  <Progress value={uploadStatus.progress} className="mt-2 h-1" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isLoading && selectedImage ? "Processing image..." : 
                    selectedImage ? "Ask a question about the image..." : 
                    "Ask a question..."
                  }
                  className="pr-20 h-[44px] resize-none border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                
                {/* Image Upload Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-8 top-1 w-8 h-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isLoading}
                  title="Upload image"
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                
                {/* File Upload Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 w-8 h-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || uploadStatus.isUploading}
                  title="Upload document"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              
              <Button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className="h-[44px] px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line. Upload documents with 📎 or images with 🖼️
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 