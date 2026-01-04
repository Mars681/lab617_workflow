
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Send, Bot, User, StopCircle, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { sendSimpleChatStream } from '../../api/gemini';
import { ChatMessage, BasicChatSession } from '../../types';
import { chatHistoryService } from '../../services/chatHistoryService';
import MessageContent from './components/MessageContent';
import MessageActions from './components/MessageActions';
import { WelcomeScreen } from './components/WelcomeScreen';
import { queryKnowledgeBase } from '../../api/rag';

interface BasicChatProps {
  providerId: string;
  sessionId: string | null;
  onSessionChange: (id: string) => void;
  selectedProjectIds: string[];
  onSelectedProjectIdsChange: (ids: string[]) => void;
}

const BasicChat: React.FC<BasicChatProps> = ({ 
  providerId, 
  sessionId, 
  onSessionChange,
  selectedProjectIds,
  onSelectedProjectIdsChange 
}) => {
  const { t } = useTranslation();
  
  // -- Chat State --
  // Initialize to null to force synchronization with sessionId prop on mount
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]); 
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // -- Refs --
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isChatEmpty = messages.length === 0;

  // --------------------------------------------------------------------------
  // Lifecycle & Session Management
  // --------------------------------------------------------------------------

  // Helper to init new session
  const createNewSession = () => {
    const newId = uuidv4();
    setCurrentSessionId(newId);
    setMessages([]);
    setEditingIndex(null);
    setInput('');
    onSelectedProjectIdsChange([]); // Clear selection for new chat
    // Notify parent about new session ID
    onSessionChange(newId);
  };

  // Sync with prop changes
  useEffect(() => {
    // Case 1: Switching to a specific session (or initial load of one)
    if (sessionId && sessionId !== currentSessionId) {
        const session = chatHistoryService.getSessionById(sessionId);
        if (session) {
            setCurrentSessionId(session.id);
            setMessages(session.messages);
            setEditingIndex(null);
            // Sync selected projects from session to App state
            if (session.selectedProjectIds) {
                onSelectedProjectIdsChange(session.selectedProjectIds);
            } else {
                onSelectedProjectIdsChange([]);
            }
        } else {
            // Edge case: Prop ID exists but not in storage (e.g. deleted). Reset.
            createNewSession();
        }
    } 
    // Case 2: Parent requested New Chat (passed null), but we are holding a session
    else if (sessionId === null && currentSessionId !== null) {
        createNewSession();
    } 
    // Case 3: Initial boot without any session
    else if (!sessionId && !currentSessionId) {
        createNewSession();
    }
  }, [sessionId]); // Depends mainly on sessionId prop changes

  // Auto-Save Effect
  useEffect(() => {
    // Prevent auto-save if there's a mismatch between props and state (e.g., during deletion/transition)
    if (sessionId !== undefined && sessionId !== currentSessionId) return;

    if (!currentSessionId || messages.length === 0) return;

    // Determine Title: Use first user message, truncate to 30 chars
    let title = "New Chat";
    const existingSession = chatHistoryService.getSessionById(currentSessionId);
    
    // Only set title automatically if it's currently "New Chat" or undefined
    if (!existingSession?.title || existingSession.title === 'New Chat') {
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg) {
            title = firstUserMsg.content.slice(0, 30);
        }
    } else {
        title = existingSession.title;
    }

    const updatedSession: BasicChatSession = {
        id: currentSessionId,
        title,
        messages,
        updatedAt: Date.now(),
        selectedProjectIds // Persist selected KBs
    };

    chatHistoryService.saveSession(updatedSession);
  }, [messages, currentSessionId, selectedProjectIds, sessionId]);


  // --------------------------------------------------------------------------
  // Chat Logic
  // --------------------------------------------------------------------------

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const runChat = async (baseHistory: ChatMessage[], userMsg: string) => {
    setIsLoading(true);
    setEditingIndex(null);

    const userMessage: ChatMessage = { role: 'user', content: userMsg };
    const modelPlaceholder: ChatMessage = { role: 'model', content: '' };

    const nextMessages: ChatMessage[] = [...baseHistory, userMessage, modelPlaceholder];
    setMessages(nextMessages);

    abortControllerRef.current = new AbortController();

    try {
      // --- RAG Retrieval Logic ---
      let augmentedMessage = userMsg;
      if (selectedProjectIds.length > 0) {
        try {
          const context = await queryKnowledgeBase(userMsg, selectedProjectIds);
          if (context) {
            augmentedMessage = `[Reference Material from Knowledge Base]:\n${context}\n\n[User Query]:\n${userMsg}`;
          }
        } catch (e) {
          console.warn("RAG retrieval failed", e);
        }
      }

      const historyContext = baseHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      await sendSimpleChatStream(
        historyContext,
        augmentedMessage, // Send the augmented message with context to the LLM
        (chunk) => {
          setMessages(prev => {
            const newArr = [...prev];
            const lastIndex = newArr.length - 1;
            if (newArr[lastIndex] && newArr[lastIndex].role === 'model') {
              newArr[lastIndex] = {
                ...newArr[lastIndex],
                content: newArr[lastIndex].content + chunk
              };
            }
            return newArr;
          });
        },
        providerId,
        abortControllerRef.current?.signal
      );

    } catch (e: any) {
      if (e.message !== 'Aborted' && e.name !== 'AbortError') {
        setMessages(prev => {
          const newArr = [...prev];
          const lastIndex = newArr.length - 1;
          if (newArr[lastIndex] && newArr[lastIndex].role === 'model') {
            newArr[lastIndex].content += `\n\n**Error:** ${e.message || t('chat.error')}`;
          }
          return newArr;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const baseHistory = editingIndex !== null ? messages.slice(0, editingIndex) : messages;

    setInput('');
    // Force height reset immediately after send
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    runChat(baseHistory, userMsg);
  };

  const handlePromptSelect = (prompt: string) => {
    if (isLoading) return;
    runChat([], prompt);
  };

  const handleStop = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setIsLoading(false);
          
          setMessages(prev => {
            const newArr = [...prev];
            const lastIndex = newArr.length - 1;
            if (newArr[lastIndex] && newArr[lastIndex].role === 'model') {
                newArr[lastIndex].content += " [Aborted]";
            }
            return newArr;
        });
      }
  };

  const handleCopyMessage = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleResendFromUser = (index: number) => {
    if (isLoading) return;
    const target = messages[index];
    if (!target || target.role !== 'user') return;
    const baseHistory = messages.slice(0, index);
    runChat(baseHistory, target.content);
  };

  const handleRegenerate = (modelIndex: number) => {
    if (isLoading) return;
    const userIndex = (() => {
      for (let i = modelIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') return i;
      }
      return -1;
    })();
    if (userIndex === -1) return;
    const baseHistory = messages.slice(0, userIndex);
    runChat(baseHistory, messages[userIndex].content);
  };

  const handleEdit = (index: number) => {
    const target = messages[index];
    if (!target || target.role !== 'user') return;
    setInput(target.content);
    setEditingIndex(index);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleQuote = (text: string) => {
    setInput(prev => prev ? `${prev}\n\n> ${text}` : text);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 relative transition-colors duration-200 min-w-0">
        
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {isChatEmpty ? (
             <WelcomeScreen onSelectPrompt={handlePromptSelect} />
          ) : (
             // Content
             <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                  <div className="h-4" /> 

                  {messages.map((m, idx) => {
                      const isUser = m.role === 'user';
                      const isEditing = editingIndex === idx;
                      if (!m.content && !isLoading && !isUser) return null;

                      return (
                          <div key={idx} className={`group flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                              {/* Avatar */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                                  isUser 
                                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400'
                              }`}>
                                  {isUser ? <User size={16} /> : <Bot size={16} />}
                              </div>

                              {/* Bubble */}
                              <div className={`relative max-w-[85%] ${isUser ? 'flex justify-end flex-col items-end' : 'w-full flex flex-col'}`}>
                                  <div className={`px-4 py-3 rounded-2xl text-base leading-relaxed shadow-sm ${
                                      isUser 
                                      ? `bg-indigo-50 dark:bg-indigo-900/20 text-slate-800 dark:text-slate-100 rounded-tr-sm border ${isEditing ? 'border-amber-400 ring-2 ring-amber-200/60 dark:ring-amber-600/40' : 'border-indigo-100 dark:border-indigo-800'}`
                                      : 'bg-transparent text-slate-800 dark:text-slate-100 -mt-1'
                                  }`}>
                                      {isUser ? (
                                          <div className="whitespace-pre-wrap">{m.content}</div>
                                      ) : (
                                          <MessageContent 
                                              content={m.content} 
                                              isStreaming={isLoading && idx === messages.length - 1} 
                                          />
                                      )}
                                  </div>

                                  <MessageActions
                                    isUser={isUser}
                                    messageIndex={idx}
                                    copiedKey={copiedKey}
                                    disabled={isLoading}
                                    onCopy={() => handleCopyMessage(m.content, `${isUser ? 'user' : 'model'}-${idx}`)}
                                    onEdit={isUser ? () => handleEdit(idx) : undefined}
                                    onResend={isUser ? () => handleResendFromUser(idx) : undefined}
                                    onRegenerate={!isUser ? () => handleRegenerate(idx) : undefined}
                                    onQuote={!isUser ? () => handleQuote(m.content) : undefined}
                                  />
                              </div>
                          </div>
                      );
                  })}
                  <div ref={messagesEndRef} className="h-4" />
             </div>
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 bg-white dark:bg-slate-900 pt-2 pb-6">
          <div className="max-w-3xl mx-auto px-4">
              {/* Action Bar */}
              {(isLoading || messages.length > 0) && (
                  <div className="flex justify-center gap-2 mb-3 h-8">
                      {isLoading && (
                          <button 
                              onClick={handleStop}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                              <StopCircle size={14} className="text-red-500" /> Stop generating
                          </button>
                      )}
                      {!isLoading && messages.length > 0 && (
                           <button 
                              onClick={createNewSession}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-500 hover:text-indigo-600 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                           >
                              <Plus size={14} /> {t('sidebar.newChat') || 'New Chat'}
                           </button>
                   )}
                  </div>
              )}
              
              {editingIndex !== null && (
                <div className="flex items-center justify-end text-[11px] text-amber-700 dark:text-amber-300 mb-3">
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                      <span>Editing message #{editingIndex + 1}</span>
                   </div>
                </div>
              )}

              {/* If no actions visible, preserve height */}
              {(!isLoading && messages.length === 0) && <div className="h-8 mb-3" />}

              <div className="relative bg-slate-100 dark:bg-slate-800 rounded-[26px] border border-transparent focus-within:border-indigo-300 dark:focus-within:border-slate-600 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all shadow-sm">
                  <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('basicChat.placeholder')}
                      className="w-full max-h-[200px] py-3.5 pl-4 pr-12 bg-transparent border-none outline-none resize-none text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 custom-scrollbar"
                      style={{ minHeight: '52px' }}
                      rows={1}
                  />
                  
                  <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all duration-200 ${
                          input.trim() && !isLoading
                          ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                  >
                      <Send size={18} />
                  </button>
              </div>
              
              <div className="text-center mt-2">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      AI can make mistakes. Check important info.
                  </p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicChat;
