import React from 'react';
import { X, MessageCircle, Trash2, Plus, Clock } from 'lucide-react';
import { BasicChatSession } from '../../types';
import { useTranslation } from 'react-i18next';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: BasicChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onNewChat: () => void;
  sidebarWidth: number;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  sidebarWidth
}) => {
  const { t } = useTranslation();
  
  return (
    <>
      {/* Overlay to close when clicking outside (transparent) */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-transparent" onClick={onClose} />
      )}

      <div 
        className="fixed inset-y-0 z-40 w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col"
        style={{ 
            left: sidebarWidth, 
            transform: isOpen ? 'translateX(0)' : 'translateX(-120%)' 
        }}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Clock size={16} className="text-indigo-500"/>
                {t('sidebar.history') || 'History'}
            </h3>
            <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors"
            >
                <X size={16} />
            </button>
        </div>

        {/* Primary Action: New Chat */}
        <div className="p-4 pb-2 shrink-0">
            <button
                onClick={() => {
                    onNewChat();
                    onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 font-medium text-sm"
            >
                <Plus size={18} />
                {t('sidebar.newChat') || 'New Chat'}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-2 custom-scrollbar">
            {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs italic space-y-2">
                    <MessageCircle size={24} className="opacity-20" />
                    <span>No chat history found</span>
                </div>
            ) : (
                sessions.map(session => (
                    <div 
                        key={session.id}
                        onClick={() => {
                            onSelectSession(session.id);
                            // Optional: Close on select? Usually better to keep open for browsing, but up to preference.
                            // onClose(); 
                        }}
                        className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                            session.id === activeSessionId 
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800' 
                            : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${session.id === activeSessionId ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            <MessageCircle size={14} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${session.id === activeSessionId ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                {session.title || "Untitled Chat"}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-slate-400">
                                    {new Date(session.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={(e) => onDeleteSession(e, session.id)}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    </>
  );
};