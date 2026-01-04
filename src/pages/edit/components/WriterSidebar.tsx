import React, { useState, useRef, useEffect } from 'react';
import { LayoutPanelLeft, SquarePen, ChevronUp, ChevronDown, Clock, X, User, Bot, Play, Send, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatSession, Message, Outline, GeneratorState } from '../types';

interface WriterSidebarProps {
  // History & Context
  history: ChatSession[];
  currentSessionId: string | null;
  onLoadSession: (session: ChatSession) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onNewChat: () => void;
  isContextPanelOpen: boolean;
  onToggleContextPanel: () => void;

  // Messages
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  
  // Outline & Status
  currentOutline: Outline | null;
  generatorState: GeneratorState;
  currentChapter: string;
  savedChapterCount: number;

  // Input
  input: string;
  setInput: (val: string) => void;
  onInputSubmit: () => void;
  onStartWriting: () => void;
  onStop: () => void;

  // Navigation
  onChapterClick?: (title: string, slug?: string) => void;

  // Layout
  isMobile?: boolean;
}

export const WriterSidebar: React.FC<WriterSidebarProps> = ({
  history,
  currentSessionId,
  onLoadSession,
  onDeleteSession,
  onNewChat,
  isContextPanelOpen,
  onToggleContextPanel,
  messages,
  messagesEndRef,
  currentOutline,
  generatorState,
  currentChapter,
  savedChapterCount,
  input,
  setInput,
  onInputSubmit,
  onStartWriting,
  onStop,
  onChapterClick,
  isMobile = false
}) => {
  const { t } = useTranslation();
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Local state for Outline collapse
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);

  // Layout Resizing Logic
  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newWidth = e.clientX - sidebarRect.left;
      
      // Constraints
      if (newWidth >= 250 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isMobile]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const dynamicStyle = isMobile 
    ? { width: '100%', height: '100%' }
    : { width: sidebarWidth, transition: isResizing ? 'none' : 'width 300ms ease-in-out' };

  return (
    <div 
      ref={sidebarRef}
      className={`bg-slate-50 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 relative group ${isMobile ? 'absolute inset-0 z-50' : ''}`}
      style={dynamicStyle}
    >
      {/* Sidebar Content Wrapper */}
      <div className="flex flex-col h-full overflow-hidden">
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300">
          <div 
             className="flex items-center justify-between p-3 cursor-pointer bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
             onClick={onToggleContextPanel}
          >
             <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                 <LayoutPanelLeft size={14} className="text-indigo-500"/>
                 Context & History
             </div>
             <div className="flex items-center gap-2">
                 <button 
                    onClick={(e) => { e.stopPropagation(); onNewChat(); }}
                    className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded transition-colors"
                    title={t('sidebar.newChat')}
                 >
                     <SquarePen size={14} />
                 </button>
                 {isContextPanelOpen ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
             </div>
          </div>

          {isContextPanelOpen && (
              <div className="p-3 space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                 <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                         <Clock size={10} /> {t('sidebar.history')}
                     </div>
                     <div className="space-y-1">
                         {history.sort((a,b) => b.updatedAt - a.updatedAt).map(s => (
                             <div 
                                key={s.id}
                                onClick={() => onLoadSession(s)}
                                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer border ${s.id === currentSessionId ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50' : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                             >
                                 <span className="truncate flex-1">{s.title || "Untitled"}</span>
                                 <button onClick={(e) => onDeleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 ml-2"><X size={12}/></button>
                             </div>
                         ))}
                         {history.length === 0 && <div className="text-xs text-slate-400 px-2 italic">{t('history.empty')}</div>}
                     </div>
                 </div>
              </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600'}`}>
                      {m.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
                  </div>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tl-none'} ${m.isSystemEvent ? 'bg-transparent border-none shadow-none text-slate-400 italic p-0' : ''}`}>
                      {m.content}
                  </div>
              </div>
          ))}
          {(generatorState !== GeneratorState.IDLE && generatorState !== GeneratorState.AWAITING_CONFIRMATION && generatorState !== GeneratorState.COMPLETE) && (
              <div className="flex justify-center py-2 flex-col items-center gap-1">
                  <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                  <span className="text-[10px] text-indigo-500">{currentChapter ? `Writing: ${currentChapter}` : 'Thinking...'}</span>
              </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Outline */}
        {currentOutline && (
          <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
               <div 
                   className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors select-none"
                   onClick={() => setIsOutlineOpen(!isOutlineOpen)}
               >
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                       Outline
                       {generatorState === GeneratorState.AWAITING_CONFIRMATION && <span className="text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded ml-1">Confirm?</span>}
                   </div>
                   {isOutlineOpen ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
               </div>
               
               {isOutlineOpen && (
                   <div className="max-h-[35vh] overflow-y-auto p-3 pt-0 text-xs custom-scrollbar">
                       <ul className="space-y-2 pl-2 text-slate-600 dark:text-slate-400">
                           {currentOutline.chapters.map((c: any, i: number) => (
                               <li key={i} className="group/item">
                                   <div 
                                     className="truncate font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" 
                                     title={c.summary}
                                     onClick={() => onChapterClick && onChapterClick(c.title, c.slug)}
                                   >
                                     {c.title}
                                   </div>
                                   {c.children && c.children.length > 0 && (
                                       <ul className="pl-3 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-700 ml-1">
                                           {c.children.map((child: any, j: number) => (
                                               <li 
                                                 key={j} 
                                                 className="truncate text-[10px] text-slate-500 dark:text-slate-500 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                 onClick={() => onChapterClick && onChapterClick(child.title, child.slug)}
                                               >
                                                   {child.title}
                                               </li>
                                           ))}
                                       </ul>
                                   )}
                               </li>
                           ))}
                       </ul>
                   </div>
               )}
          </div>
        )}

        {/* Input */}
        <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
          {generatorState === GeneratorState.AWAITING_CONFIRMATION ? (
              <div className="space-y-2">
                 <div className="text-xs text-center text-slate-500 mb-2">Looks good?</div>
                 <button 
                    onClick={onStartWriting}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                 >
                     <Play size={16} /> {savedChapterCount > 0 ? t('btn.continueWriting') : t('btn.startWriting')}
                 </button>
                 <div className="relative flex items-center gap-2">
                    <input 
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Or modify outline..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onInputSubmit()}
                    />
                    <button onClick={onInputSubmit} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Send size={16}/></button>
                 </div>
              </div>
          ) : (
            <div className="flex items-center gap-2">
                 {generatorState !== GeneratorState.IDLE && generatorState !== GeneratorState.COMPLETE ? (
                     <button 
                        onClick={onStop}
                        className="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-2"
                     >
                         <Square size={16} fill="currentColor" /> {t('btn.stop')}
                     </button>
                 ) : (
                     <>
                        <input 
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                            placeholder={t('placeholder.input')}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onInputSubmit()}
                        />
                        <button 
                            onClick={onInputSubmit} 
                            disabled={!input.trim()}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <Send size={16}/>
                        </button>
                     </>
                 )}
            </div>
          )}
        </div>
      </div>

      {/* Drag Handle (Desktop only) */}
      {!isMobile && (
        <div
            onMouseDown={handleMouseDownResize}
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-indigo-500/50 transition-colors ${isResizing ? 'bg-indigo-500' : 'bg-transparent'}`}
        />
      )}
    </div>
  );
};