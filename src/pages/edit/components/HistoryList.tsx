import React from 'react';
import { MessageSquare, Trash2, X, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChatSession } from '../types';

interface HistoryListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onClose: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onClose
}) => {
  const { t } = useTranslation();
  return (
    <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[500px] animate-in slide-in-from-top-2 fade-in duration-200">
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
          <Clock size={14} className="text-indigo-500" />
          {t('sidebar.history')}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded">
          <X size={16} />
        </button>
      </div>
      
      <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            {t('history.empty')}
          </div>
        ) : (
          sessions.sort((a, b) => b.updatedAt - a.updatedAt).map(session => (
            <div 
              key={session.id}
              onClick={() => onSelectSession(session)}
              className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                session.id === currentSessionId 
                  ? 'bg-indigo-50 border-indigo-100' 
                  : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
              }`}
            >
              <MessageSquare 
                size={16} 
                className={`shrink-0 ${session.id === currentSessionId ? 'text-indigo-500' : 'text-slate-400'}`} 
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <div className={`text-sm font-medium truncate pr-2 ${session.id === currentSessionId ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {session.title || 'Untitled'}
                    </div>
                    <div className="text-[10px] text-slate-400 shrink-0">
                    {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                </div>
              </div>
              <button 
                onClick={(e) => onDeleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
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