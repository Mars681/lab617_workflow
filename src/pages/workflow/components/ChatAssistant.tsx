import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { streamWorkflowChat } from '../../../api/gemini';
import { ChatMessage, WorkflowGraphRequest } from '../../../types';
import MessageContent from '../../chat/components/MessageContent';

interface ChatAssistantProps {
  onAddTool: (toolId: string, reset: boolean) => void;
  onApplyGraph: (graph: WorkflowGraphRequest) => void;
  providerId: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ onAddTool, onApplyGraph, providerId }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting message (updates when language changes if empty or on reset)
  useEffect(() => {
    const welcomeMsg = t('chat.welcome');
    setMessages(prev => {
      if (prev.length === 0) {
        return [{ role: 'model', content: welcomeMsg, isWelcome: true } as any];
      }
      // Update existing welcome message if language changed (and user hasn't chatted yet)
      if (prev.length === 1 && (prev[0] as any).isWelcome && prev[0].content !== welcomeMsg) {
        return [{ ...prev[0], content: welcomeMsg }];
      }
      return prev;
    });
  }, [t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');

    // 先把用户消息 + 模型占位加进去
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMsg } as any,
      { role: 'model', content: '' } as any
    ]);

    setIsLoading(true);

    try {
      // 用“将要发送前”的消息列表来构造 history（避免闭包拿到旧 messages）
      const historyMsgs: ChatMessage[] = [
        ...messages,
        { role: 'user', content: userMsg } as any
      ];

      const history = historyMsgs.map(m => ({
        role: (m as any).role,
        parts: [{ text: (m as any).content || '' }]
      }));

      // ✅ 关键修复：streamWorkflowChat 参数顺序
      // streamWorkflowChat(history, message, onChunk, onToolCall, providerId)
      await streamWorkflowChat(
        history,
        userMsg,

        // ✅ 第3参：onChunk（流式文本）
        (chunk) => {
          setMessages(prev => {
            const newArr = [...prev];
            const lastIndex = newArr.length - 1;
            if (newArr[lastIndex] && (newArr[lastIndex] as any).role === 'model') {
              newArr[lastIndex] = {
                ...newArr[lastIndex],
                content: (newArr[lastIndex] as any).content + chunk
              } as any;
            }
            return newArr;
          });
        },

        // ✅ 第4参：onToolCall（工具调用）
        // async (toolId, reset) => {
        //   onAddTool(toolId, reset);
        //   // 你想保留成功提示也行，但建议别返回 message（避免被误用）
        //   return { ok: true, message: t('chat.success', { toolId }) };
        //   // 更稳写法：
        //   // return { ok: true };
        // },
        async (toolId, reset) => {
              console.log('[onToolCall] toolId=', toolId, 'reset=', reset);
              onAddTool(toolId, reset);
              return { ok: true, message: t('chat.success', { toolId }) };
            }, 
        async (graph) => {
          onApplyGraph(graph);
          return { ok: true, message: t('chat.success', { toolId: 'graph' }) };
        },

        providerId
      );

    } catch (e) {
      setMessages(prev => {
        const newArr = [...prev];
        const lastIndex = newArr.length - 1;
        if (newArr[lastIndex] && (newArr[lastIndex] as any).role === 'model') {
          (newArr[lastIndex] as any).content += "\n\n" + t('chat.error');
        }
        return newArr;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      <div
        className={`pointer-events-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-indigo-100 dark:border-slate-700 w-[400px] mb-4 transition-all duration-300 origin-bottom-right overflow-hidden flex flex-col ${isOpen ? 'scale-100 opacity-100 h-[550px]' : 'scale-75 opacity-0 h-0'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-semibold text-sm">{t('chat.title')}</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900 custom-scrollbar">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${(m as any).role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${(m as any).role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300'}`}>
                {(m as any).role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`rounded-2xl text-sm max-w-[85%] shadow-sm ${
                (m as any).role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none px-3 py-2'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none px-1 py-1'
              }`}>
                {(m as any).role === 'user' ? (
                  <div>{(m as any).content}</div>
                ) : (
                  <div className="p-2">
                    <MessageContent
                      content={(m as any).content}
                      isStreaming={isLoading && idx === messages.length - 1}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator (only if waiting for first chunk) */}
          {isLoading && messages.length > 0 && (messages[messages.length - 1] as any).content === '' && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
            <input
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
              placeholder={t('chat.placeholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'}`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};

export default ChatAssistant;
