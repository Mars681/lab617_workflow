import React, { useRef, useState, useEffect } from 'react';
import { SquarePen, Download, HelpCircle, Palette, Eye, Code, ClipboardList, ChevronDown, Check, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WriterToolbarProps {
  title: string;
  viewMode: 'preview' | 'source';
  onToggleViewMode: () => void;
  currentTheme: string;
  onSetTheme: (theme: string) => void;
  hasGlobalContext: boolean;
  onOpenRequirements: () => void;
  onShowHelp: () => void;
  onDownload: () => void;
  onToggleMobileSidebar?: () => void;
}

export const WriterToolbar: React.FC<WriterToolbarProps> = ({
  title,
  viewMode,
  onToggleViewMode,
  currentTheme,
  onSetTheme,
  hasGlobalContext,
  onOpenRequirements,
  onShowHelp,
  onDownload,
  onToggleMobileSidebar
}) => {
  const { t } = useTranslation();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between px-4 z-[60] shadow-sm relative">
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        {onToggleMobileSidebar && (
          <button 
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <Menu size={20} />
          </button>
        )}
        <h1 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2 min-w-0">
          <SquarePen className="text-indigo-500 w-4 h-4 shrink-0 hidden sm:block" />
          <span className="truncate">{title}</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={onToggleViewMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${viewMode === 'source' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300'}`}
          title={`${viewMode === 'preview' ? t('editor.view.source') : t('editor.view.preview')} (Ctrl + /)`}
        >
          {viewMode === 'preview' ? <Code size={14} /> : <Eye size={14} />}
          <span className="hidden sm:inline">{viewMode === 'preview' ? t('editor.view.source') : t('editor.view.preview')}</span>
        </button>

        {viewMode === 'preview' && (
          <div className="relative z-50" ref={themeMenuRef}>
            <button 
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 transition-all"
              title={t('editor.theme.title')}
            >
              <Palette size={14} />
              <span className="hidden md:inline">
                {currentTheme === 'theme-lab' ? t('editor.theme.lab') : t('editor.theme.academic')}
              </span>
              <ChevronDown size={12} />
            </button>
            
            {isThemeMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <button 
                  onClick={() => { onSetTheme('theme-lab'); setIsThemeMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 ${currentTheme === 'theme-lab' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {t('editor.theme.lab')}
                  {currentTheme === 'theme-lab' && <Check size={12} />}
                </button>
                <button 
                  onClick={() => { onSetTheme('theme-academic'); setIsThemeMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 ${currentTheme === 'theme-academic' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {t('editor.theme.academic')}
                  {currentTheme === 'theme-academic' && <Check size={12} />}
                </button>
              </div>
            )}
          </div>
        )}

        <button 
          onClick={onOpenRequirements}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${hasGlobalContext ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300'}`}
          title={t('editor.requirements')}
        >
          <ClipboardList size={14} />
          <span className="hidden md:inline">
            {hasGlobalContext ? t('editor.requirements.set') : t('editor.requirements')}
          </span>
        </button>
        
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
        
        <button 
          onClick={onShowHelp}
          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
          title={t('header.howToUse')}
        >
          <HelpCircle size={18} />
        </button>
        <button 
          onClick={onDownload} 
          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" 
          title={t('editor.export')}
        >
          <Download size={18} />
        </button>
      </div>
    </div>
  );
};