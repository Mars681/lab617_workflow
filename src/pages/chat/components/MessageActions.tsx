import React from 'react';
import { Copy, Check, Edit3, Sparkles, RefreshCw } from 'lucide-react';
import ChatActionButton from './ChatActionButton';

interface MessageActionsProps {
  isUser: boolean;
  messageIndex: number;
  copiedKey: string | null;
  onCopy: () => void;
  onEdit?: () => void;
  onResend?: () => void;
  onRegenerate?: () => void;
  onQuote?: () => void;
  disabled?: boolean;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  isUser,
  messageIndex,
  copiedKey,
  onCopy,
  onEdit,
  onResend,
  onRegenerate,
  onQuote,
  disabled
}) => {
  const copied = copiedKey === `${isUser ? 'user' : 'model'}-${messageIndex}`;

  return (
    <div className={`flex gap-1 mt-2 text-xs ${isUser ? 'justify-end' : 'justify-start'} text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto`}>
      <ChatActionButton 
        icon={copied ? <Check size={12} /> : <Copy size={12} />} 
        label={copied ? '已复制' : '复制'} 
        onClick={onCopy}
        disabled={disabled}
      />
      {isUser ? (
        <>
          {onEdit && (
            <ChatActionButton 
              icon={<Edit3 size={12} />} 
              label="编辑" 
              onClick={onEdit}
              disabled={disabled}
            />
          )}
          {onResend && (
            <ChatActionButton 
              icon={<Sparkles size={12} />} 
              label="重问" 
              onClick={onResend}
              disabled={disabled}
            />
          )}
        </>
      ) : (
        <>
          {onRegenerate && (
            <ChatActionButton 
              icon={<RefreshCw size={12} />} 
              label="重生成" 
              onClick={onRegenerate}
              disabled={disabled}
            />
          )}
          {onQuote && (
            <ChatActionButton 
              icon={<Sparkles size={12} />} 
              label="引用" 
              onClick={onQuote}
              disabled={disabled}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MessageActions;
