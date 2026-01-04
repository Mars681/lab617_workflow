
import React from 'react';
import { X, Zap, Check, Cpu, Terminal, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModelProvider } from '../../types';

interface ModelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedId: string;
  providers: ModelProvider[];
  onChange: (id: string) => void;
  sidebarWidth: number;
}

export const ModelDrawer: React.FC<ModelDrawerProps> = ({ 
  isOpen, 
  onClose, 
  selectedId, 
  providers, 
  onChange,
  sidebarWidth
}) => {
  const { t } = useTranslation();

  const getIcon = (type: string) => {
    switch(type) {
      case 'gemini': return <Cpu size={16} />;
      case 'openai': return <Zap size={16} />;
      case 'ollama': return <Terminal size={16} />;
      default: return <Server size={16} />;
    }
  };

  const getIconColorBg = (type: string) => {
    switch(type) {
      case 'gemini': return 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
      case 'openai': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'ollama': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

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
                <Zap size={16} className="text-amber-500"/>
                {t('model.selector.title')}
            </h3>
            <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors"
            >
                <X size={16} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-2 custom-scrollbar">
            {providers.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onChange(p.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                    p.id === selectedId 
                      ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' 
                      : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                   <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs border border-black/5 dark:border-white/5 ${getIconColorBg(p.type)}`}>
                      {getIcon(p.type)}
                   </div>
                   <div className="flex-1 text-left min-w-0">
                      <div className={`text-sm font-medium truncate ${p.id === selectedId ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5">
                        {p.selectedModel}
                      </div>
                   </div>
                   {p.id === selectedId && <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0"/>}
                </button>
            ))}
        </div>
      </div>
    </>
  );
};
