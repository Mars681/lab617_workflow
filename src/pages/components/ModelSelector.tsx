import React, { useState, useRef, useEffect } from 'react';
import { Cpu, ChevronUp, Zap, Terminal, Server, Check } from 'lucide-react';
import { ModelProvider } from '../../types';

interface ModelSelectorProps {
  selectedId: string;
  providers: ModelProvider[];
  onChange: (id: string) => void;
  isCollapsed: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedId, 
  providers, 
  onChange,
  isCollapsed
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = providers.find(p => p.id === selectedId);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close when collapsed
  useEffect(() => {
    if (isCollapsed) setIsOpen(false);
  }, [isCollapsed]);

  if (isCollapsed) return null;

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
    <div className="px-3 mb-2 animate-in fade-in duration-300" ref={containerRef}>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
         <Zap size={10} className="text-amber-500" /> Model Provider
      </div>
      
      <div className="relative w-full">
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${isOpen ? 'bg-indigo-50/50 border-indigo-200 dark:bg-slate-800 dark:border-indigo-500/50' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5 ${getIconColorBg(current?.type || '')}`}>
             {getIcon(current?.type || '')}
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">
                {current?.name || 'Select Provider'}
             </div>
             <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5 font-mono opacity-80">
                {current?.selectedModel || 'No model'}
             </div>
          </div>
          
          <ChevronUp size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
        </button>

        {/* Dropdown Menu (Drop UP) */}
        {isOpen && (
          <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 flex flex-col max-h-64">
            <div className="overflow-y-auto p-1 custom-scrollbar">
              {providers.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${p.id === selectedId ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                   <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs ${getIconColorBg(p.type)}`}>
                      {getIcon(p.type)}
                   </div>
                   <div className="flex-1 text-left min-w-0">
                      <div className={`text-xs font-medium truncate ${p.id === selectedId ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {p.name}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate font-mono">
                        {p.selectedModel}
                      </div>
                   </div>
                   {p.id === selectedId && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0"/>}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
               <div className="text-[9px] text-center text-slate-400">
                  Select active inference model
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};