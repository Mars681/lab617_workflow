import React from 'react';
import { MessageSquare, Trash2, Plus, X, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BasicChatSession } from '../../../types';

interface ChatSidebarProps {
  sessions: BasicChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();

  return (
    <div 
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:translate-x-0 md:w-64 flex flex-col h-full shrink-0`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm">
          <MessageCircle size={16} className="text-indigo-500" />
          {t('sidebar.history') || 'History'}
        </h2>
        <button 
          onClick={onClose} 
          className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm active:scale-95"
        >
          <Plus size={16} />
          {t('sidebar.newChat') || 'New Chat'}
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs italic">
            <span>{t('history.empty') || 'No history yet'}</span>
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                session.id === currentSessionId
                  ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-900 shadow-sm text-indigo-700 dark:text-indigo-300'
                  : 'bg-transparent border-transparent hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <MessageSquare size={16} className={`shrink-0 ${session.id === currentSessionId ? 'text-indigo-500' : 'text-slate-400'}`} />
              
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {session.title || 'Untitled Chat'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={(e) => onDeleteSession(e, session.id)}
                className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};