import React from 'react';
import { Bot, User } from 'lucide-react';
import { ChatMessage } from '../../../types';
import MessageContent from './MessageContent';
import MessageActions from './MessageActions';

interface MessageItemProps {
  message: ChatMessage;
  index: number;
  isStreaming: boolean;
  onCopy: () => void;
  onEdit?: () => void;
  onResend?: () => void;
  onRegenerate?: () => void;
  onQuote?: () => void;
  copiedKey: string | null;
  isLoading: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  index,
  isStreaming,
  onCopy,
  onEdit,
  onResend,
  onRegenerate,
  onQuote,
  copiedKey,
  isLoading
}) => {
  const isUser = message.role === 'user';
  
  // Only render if it has content OR if it's the loading placeholder for the assistant
  if (!message.content && !isLoading && !isUser) return null;

  return (
    <div className={`group flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
        isUser 
          ? 'bg-indigo-600 border-indigo-600 text-white' 
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400'
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Bubble Container */}
      <div className={`relative max-w-[85%] ${isUser ? 'flex justify-end flex-col items-end' : 'w-full flex flex-col items-start'}`}>
        
        {/* Name Label */}
        <div className={`text-[10px] text-slate-400 mb-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {isUser ? 'You' : 'AI Model'}
        </div>

        {/* Content Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-base leading-relaxed shadow-sm w-auto ${
            isUser 
            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-slate-800 dark:text-slate-100 rounded-tr-sm border border-indigo-100 dark:border-indigo-800' 
            : 'bg-transparent text-slate-800 dark:text-slate-100 -mt-2 -ml-2' // Minimalist style for bot
        }`}>
            {isUser ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
                <MessageContent 
                    content={message.content} 
                    isStreaming={isStreaming} 
                />
            )}
        </div>

        {/* Actions Toolbar */}
        <div className="mt-1 px-1">
            <MessageActions
                isUser={isUser}
                messageIndex={index}
                copiedKey={copiedKey}
                disabled={isLoading}
                onCopy={onCopy}
                onEdit={onEdit}
                onResend={onResend}
                onRegenerate={onRegenerate}
                onQuote={onQuote}
            />
        </div>
      </div>
    </div>
  );
};
