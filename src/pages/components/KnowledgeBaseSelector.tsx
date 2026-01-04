import React, { useState, useRef, useEffect } from 'react';
import { Database, ChevronDown, Check, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Project } from '../../types';

interface KnowledgeBaseSelectorProps {
  projects: Project[] | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export const KnowledgeBaseSelector: React.FC<KnowledgeBaseSelectorProps> = ({
  projects,
  selectedIds,
  onChange,
  disabled
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(pid => pid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCount = selectedIds.length;
  
  // If projects aren't loaded yet, don't render anything
  if (!projects) return null;

  return (
    <div className="px-3 mb-2" ref={containerRef}>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
         <Database size={10} className="text-indigo-500" /> {t('sidebar.selectProject') || 'Knowledge Base'}
      </div>

      <div className="relative w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || projects.length === 0}
          className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
            isOpen 
              ? 'bg-indigo-50/50 border-indigo-200 dark:bg-slate-800 dark:border-indigo-500/50 ring-1 ring-indigo-500/20' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
          }`}
        >
          {/* Icon Box */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5 ${
             selectedCount > 0 
               ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' 
               : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}>
             <Layers size={16} />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div className={`text-xs font-bold truncate leading-tight ${
                selectedCount > 0 
                  ? 'text-indigo-700 dark:text-indigo-300' 
                  : 'text-slate-700 dark:text-slate-200'
             }`}>
                {projects.length === 0 ? t('sidebar.noProjects') : (selectedCount > 0 ? 'Knowledge Base' : 'Select Project')}
             </div>
             <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5 font-mono opacity-80">
                {selectedCount > 0 ? `${selectedCount} selected` : 'None selected'}
             </div>
          </div>
          
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
        </button>

        {/* Absolute Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 flex flex-col max-h-64">
            <div className="overflow-y-auto p-1 custom-scrollbar">
              {projects.length === 0 ? (
                  <div className="p-4 text-center">
                    <div className="text-xs text-slate-400 italic mb-1">{t('sidebar.noProjects')}</div>
                  </div>
              ) : (
                  projects.map(p => {
                      const isSelected = selectedIds.includes(p.id);
                      return (
                          <div 
                              key={p.id} 
                              onClick={(e) => toggleProject(p.id, e)}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                                  isSelected 
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                          >
                              {/* Checkbox-style indicator */}
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected 
                                  ? 'bg-indigo-500 border-indigo-500 text-white' 
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}>
                                  {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                  <div className={`text-xs font-medium truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                      {p.name}
                                  </div>
                                  {p.description && (
                                    <div className="text-[9px] text-slate-400 truncate">{p.description}</div>
                                  )}
                              </div>
                          </div>
                      );
                  })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
