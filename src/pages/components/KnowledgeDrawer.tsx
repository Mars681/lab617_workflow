
import React from 'react';
import { X, Database, Check, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Project } from '../../types';

interface KnowledgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[] | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  sidebarWidth: number;
}

export const KnowledgeDrawer: React.FC<KnowledgeDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  selectedIds,
  onChange,
  sidebarWidth
}) => {
  const { t } = useTranslation();
  
  const toggleProject = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(pid => pid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCount = selectedIds.length;

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
                <Database size={16} className="text-indigo-500"/>
                {t('knowledge.selector.title')}
            </h3>
            <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors"
            >
                <X size={16} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-2 custom-scrollbar">
            {!projects ? (
                <div className="p-4 text-center text-slate-400 text-xs">{t('knowledge.selector.loading')}</div>
            ) : projects.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs italic">
                    {t('knowledge.selector.empty')}
                </div>
            ) : (
                projects.map(p => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                        <div 
                            key={p.id} 
                            onClick={() => toggleProject(p.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                isSelected 
                                ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' 
                                : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                        >
                            {/* Checkbox-style indicator */}
                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected 
                                ? 'bg-indigo-500 border-indigo-500 text-white' 
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {p.name}
                                </div>
                                {p.description && (
                                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.description}</div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>
    </>
  );
};
