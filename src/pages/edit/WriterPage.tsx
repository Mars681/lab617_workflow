
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import { WriterToolbar } from './components/WriterToolbar';
import { WriterSidebar } from './components/WriterSidebar';
import { Editor, EditorHandle } from './components/Editor';
import { RefinementControl } from './components/RefinementControl';
import { HelpModal } from '../components/HelpModal';
import { SquarePen, Download, HelpCircle, Palette, Eye, Code, ClipboardList } from 'lucide-react';
import { ChatSession, Message, Outline, GeneratorState } from './types';
import { generateCompletion, generateOutline, refineText, refineOutline } from '../../api/writer';
import { historyService } from './services/historyService';
import { parseMarkdownToOutline } from './utils/markdownUtils';

// Helper for mobile detection
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
};

interface WriterPageProps {
  providerId: string;
  selectedProjectIds: string[];
  onSelectedProjectIdsChange: (ids: string[]) => void;
}

export const WriterPage: React.FC<WriterPageProps> = ({ 
  providerId, 
  selectedProjectIds,
  onSelectedProjectIdsChange
}) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // -- Global State --
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatSession[]>([]);
  
  // -- UI State --
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [theme, setTheme] = useState('theme-lab');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isRequirementsOpen, setIsRequirementsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);
  
  // -- Content State --
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState<string>('');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [globalContext, setGlobalContext] = useState('');
  const [globalReqBuffer, setGlobalReqBuffer] = useState('');
  
  // -- Generator State --
  const [generatorState, setGeneratorState] = useState<GeneratorState>(GeneratorState.IDLE);
  const [currentChapter, setCurrentChapter] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [contentUpdateTimestamp, setContentUpdateTimestamp] = useState(Date.now());

  // -- Refinement State --
  const [refinementState, setRefinementState] = useState<{
    isOpen: boolean;
    selectedText: string;
    contextPrefix: string;
    contextSuffix: string;
    generatedText: string;
    isGenerating: boolean;
  }>({
    isOpen: false,
    selectedText: '',
    contextPrefix: '',
    contextSuffix: '',
    generatedText: '',
    isGenerating: false
  });

  const editorRef = useRef<EditorHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Derived State ---
  // Calculates the effective outline to display in the sidebar.
  // If we are generating (Planning/Confirming), show the AI Plan (state.outline).
  // Otherwise, derive the outline from the actual document content for navigation.
  const effectiveOutline = useMemo(() => {
    // 1. If actively planning, use the AI's proposal
    if (generatorState === GeneratorState.PLANNING || generatorState === GeneratorState.AWAITING_CONFIRMATION) {
        return outline;
    }
    
    // 2. If we have content, derive outline from headers for navigation
    if (content.trim()) {
        const parsed = parseMarkdownToOutline(content);
        if (parsed && parsed.chapters.length > 0) {
            return parsed;
        }
    }
    
    // 3. Fallback to stored outline if content is empty or parsing failed
    return outline;
  }, [outline, content, generatorState]);

  // --- Effects ---

  // Load History on Mount
  useEffect(() => {
    historyService.getSessions().then(setHistory);
    // Use a fresh ID initially, but don't save it yet
    if (!currentSessionId) {
        handleNewChat();
    }
  }, []);

  // Handle Global Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle View Mode (Ctrl + / or Cmd + /)
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setViewMode(prev => prev === 'preview' ? 'source' : 'preview');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load Session Logic
  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setContent(session.documentContent);
    setOutline(session.outline);
    setGlobalContext(session.globalContext || '');
    if (session.selectedProjectIds) {
        onSelectedProjectIdsChange(session.selectedProjectIds);
    }
    setMobileSidebarOpen(false);
    // Force editor update
    setContentUpdateTimestamp(Date.now());
  };

  // Auto-Save
  useEffect(() => {
    if (!currentSessionId) return;
    
    // Debounce save
    const timer = setTimeout(() => {
        // 1. Guard: Check if session is "empty" (just welcome msg, no content, no outline)
        // We do NOT want to save empty "New Chat" sessions to the history list
        const hasUserMessage = messages.some(m => m.role === 'user');
        const hasContent = content.trim().length > 0;
        const hasOutline = !!outline;
        
        if (!hasUserMessage && !hasContent && !hasOutline) {
            return; // Don't persist empty sessions
        }

        // 2. Determine Logic Title
        let displayTitle = "Untitled Document";
        if (outline?.title) {
            displayTitle = outline.title;
        } else if (hasContent) {
             // Fallback: Try to find first H1
             const match = content.match(/^#\s+(.+)$/m);
             if (match) displayTitle = match[1].trim();
             else {
                 // Fallback: First few words of content
                 displayTitle = content.slice(0, 30).replace(/\n/g, ' ');
             }
        } else if (hasUserMessage) {
            const firstUser = messages.find(m => m.role === 'user');
            if (firstUser) displayTitle = firstUser.content.slice(0, 30);
        }

        const current: ChatSession = {
            id: currentSessionId,
            title: displayTitle,
            updatedAt: Date.now(),
            preview: content.slice(0, 100),
            messages,
            documentContent: content,
            outline,
            globalContext,
            selectedProjectIds
        };
        
        historyService.saveSession(current);
        
        // Update local list to reflect changes without full reload
        setHistory(prev => {
            const idx = prev.findIndex(s => s.id === currentSessionId);
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = current;
                return copy;
            }
            // Add new if not exists
            return [current, ...prev];
        });
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, messages, outline, globalContext, currentSessionId, selectedProjectIds]);

  // --- Actions ---

  const handleNewChat = () => {
    setCurrentSessionId(uuidv4());
    setMessages([{ role: 'assistant', content: t('message.welcome'), isWelcome: true }]);
    setContent('');
    setOutline(null);
    setGeneratorState(GeneratorState.IDLE);
    setMobileSidebarOpen(false);
    // Force editor update
    setContentUpdateTimestamp(Date.now());
    // Note: We don't clear selectedProjectIds here by default, optional choice.
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await historyService.deleteSession(id);
    setHistory(prev => prev.filter(s => s.id !== id));
    
    // If deleting the currently active session, start a fresh one
    if (currentSessionId === id) {
        handleNewChat();
    }
  };

  // --- Generation Logic ---

  const handleInputSubmit = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // Determine Action based on State
    if (generatorState === GeneratorState.IDLE || generatorState === GeneratorState.COMPLETE) {
        // Start Planning
        setGeneratorState(GeneratorState.PLANNING);
        const loadingMsgId = uuidv4();
        setMessages(prev => [...prev, { role: 'assistant', content: t('message.planning'), isStreaming: true }]); // simplified for UI

        const ac = new AbortController();
        setAbortController(ac);

        try {
            const result = await generateOutline(userMsg, (chunk) => {}, ac.signal, providerId);
            if (result) {
                setOutline(result);
                setMessages(prev => [
                    ...prev.slice(0, -1), // remove loading
                    { role: 'assistant', content: t('message.outlineGenerated', { title: result.title }) }
                ]);
                setGeneratorState(GeneratorState.AWAITING_CONFIRMATION);
            } else {
                setMessages(prev => [
                    ...prev.slice(0, -1),
                    { role: 'assistant', content: t('message.outlineError') }
                ]);
                setGeneratorState(GeneratorState.IDLE);
            }
        } catch (e) {
            setGeneratorState(GeneratorState.IDLE);
        }
    } else if (generatorState === GeneratorState.AWAITING_CONFIRMATION) {
        // Refine Outline
        if (!outline) return;
        setMessages(prev => [...prev, { role: 'assistant', content: "Updating outline...", isStreaming: true }]);
        
        const ac = new AbortController();
        setAbortController(ac);
        
        try {
            const newOutline = await refineOutline(outline, userMsg, () => {}, ac.signal, providerId);
            setOutline(newOutline);
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: t('message.outlineUpdated') }
            ]);
        } catch (e) {
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: t('message.outlineUpdateFailed') }
            ]);
        }
    }
  };

  const handleStartWriting = async () => {
      // NOTE: We use the stored `outline` (Plan) for generation, not the derived `effectiveOutline`.
      if (!outline) return;
      setGeneratorState(GeneratorState.WRITING);
      setMessages(prev => [...prev, { role: 'assistant', content: t('message.writingStart') }]);
      
      const ac = new AbortController();
      setAbortController(ac);

      // Initialize Content if empty
      // We use a local variable `currentDoc` to accumulate content during the loop 
      // to avoid closure staleness issues with state `content`.
      let currentDoc = content;
      if (!currentDoc.trim()) {
          currentDoc = `# ${outline.title}\n\n`;
          setContent(currentDoc);
          setContentUpdateTimestamp(Date.now());
      }

      try {
          for (const chapter of outline.chapters) {
              // Check stop signal
              if (ac.signal.aborted) break;

              setCurrentChapter(chapter.title);
              
              // Skip if already written (simple check)
              if (currentDoc.includes(`## ${chapter.title}`)) continue;

              // 1. Append Chapter Header immediately so user sees progress
              currentDoc = currentDoc.trimEnd() + `\n\n## ${chapter.title}\n\n`;
              setContent(currentDoc);
              setContentUpdateTimestamp(Date.now());

              // 2. Generate Content with real-time streaming
              await new Promise<void>((resolve, reject) => {
                  refineText(
                      "", // No selection
                      // Improved Prompt: Explicitly forbid repeating the title to avoid "## Chapter ## Chapter" duplication issues
                      `Write the full content for the chapter titled "${chapter.title}".\n\nChapter Summary/Points:\n${chapter.summary}\n\nIMPORTANT: The chapter header "## ${chapter.title}" is already written in the document. DO NOT output the chapter title again. Start directly with the text content.`,
                      selectedProjectIds,
                      currentDoc.slice(-1000), // prefix context
                      "", // suffix
                      globalContext,
                      (chunk) => { 
                          // Stream update
                          currentDoc += chunk;
                          setContent(currentDoc);
                          // Editor's useEffect will catch this state update
                      },
                      ac.signal,
                      'text',
                      providerId
                  ).then(() => resolve()).catch(reject);
              });

              // 3. Mark timestamp to ensure sync
              setContentUpdateTimestamp(Date.now());
          }
          
          if (!ac.signal.aborted) {
              setGeneratorState(GeneratorState.COMPLETE);
              setMessages(prev => [...prev, { role: 'assistant', content: t('message.writingComplete') }]);
          } else {
              setMessages(prev => [...prev, { role: 'assistant', content: t('message.writingAborted') }]);
              setGeneratorState(GeneratorState.IDLE);
          }
      } catch (e: any) {
          if (e.message !== "Generation aborted by user") {
             setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
          } else {
             setMessages(prev => [...prev, { role: 'assistant', content: t('message.writingAborted') }]);
          }
          setGeneratorState(GeneratorState.IDLE);
      } finally {
          setAbortController(null);
          setCurrentChapter('');
      }
  };

  const handleStop = () => {
      if (abortController) {
          abortController.abort();
          setAbortController(null);
      }
  };

  // --- Refinement Logic ---

  const handleSelectionAction = (text: string, prefix: string, suffix: string) => {
      setRefinementState({
          isOpen: true,
          selectedText: text,
          contextPrefix: prefix,
          contextSuffix: suffix,
          generatedText: '',
          isGenerating: false
      });
  };

  const handleRefineRequest = async (instruction: string) => {
      setRefinementState(prev => ({ ...prev, isGenerating: true, generatedText: '' }));
      
      const ac = new AbortController();
      
      try {
          let buffer = "";
          await refineText(
              refinementState.selectedText,
              instruction,
              selectedProjectIds,
              refinementState.contextPrefix,
              refinementState.contextSuffix,
              globalContext,
              (chunk) => {
                  buffer += chunk;
                  setRefinementState(prev => ({ ...prev, generatedText: buffer }));
              },
              ac.signal,
              'text',
              providerId
          );
      } catch (e) {
          console.error(e);
      } finally {
          setRefinementState(prev => ({ ...prev, isGenerating: false }));
      }
  };

  const handleRefineApply = (newText: string, mode: 'replace' | 'insert') => {
      if (editorRef.current) {
          editorRef.current.applyRefinement(newText, mode);
          setRefinementState(prev => ({ ...prev, isOpen: false }));
      }
  };

  const handleDownload = () => {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${outline?.title || 'document'}.md`;
      a.click();
  };

  // Navigation from Sidebar to Editor
  const handleChapterClick = (title: string, slug?: string) => {
      if (editorRef.current) {
          editorRef.current.scrollToSection(title, slug);
          if (isMobile) {
              setMobileSidebarOpen(false);
          }
      }
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
           <div 
             className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
             onClick={() => setMobileSidebarOpen(false)}
           />
           <div className="relative w-4/5 max-w-sm h-full shadow-2xl animate-in slide-in-from-left duration-300">
              <WriterSidebar 
                history={history}
                currentSessionId={currentSessionId}
                onLoadSession={loadSession}
                onDeleteSession={handleDeleteSession}
                onNewChat={handleNewChat}
                isContextPanelOpen={isContextPanelOpen}
                onToggleContextPanel={() => setIsContextPanelOpen(!isContextPanelOpen)}
                messages={messages}
                messagesEndRef={messagesEndRef}
                currentOutline={effectiveOutline} 
                generatorState={generatorState}
                currentChapter={currentChapter}
                savedChapterCount={0}
                input={input}
                setInput={setInput}
                onInputSubmit={handleInputSubmit}
                onStartWriting={handleStartWriting}
                onStop={handleStop}
                onChapterClick={handleChapterClick}
                isMobile={true}
              />
           </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <WriterSidebar 
            history={history}
            currentSessionId={currentSessionId}
            onLoadSession={loadSession}
            onDeleteSession={handleDeleteSession}
            onNewChat={handleNewChat}
            isContextPanelOpen={isContextPanelOpen}
            onToggleContextPanel={() => setIsContextPanelOpen(!isContextPanelOpen)}
            messages={messages}
            messagesEndRef={messagesEndRef}
            currentOutline={effectiveOutline} 
            generatorState={generatorState}
            currentChapter={currentChapter}
            savedChapterCount={0}
            input={input}
            setInput={setInput}
            onInputSubmit={handleInputSubmit}
            onStartWriting={handleStartWriting}
            onStop={handleStop}
            onChapterClick={handleChapterClick}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 h-full relative">
         <WriterToolbar 
            title={effectiveOutline?.title || "Untitled Document"}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode(v => v === 'preview' ? 'source' : 'preview')}
            currentTheme={theme}
            onSetTheme={setTheme}
            hasGlobalContext={!!globalContext}
            onOpenRequirements={() => { setGlobalReqBuffer(globalContext); setIsRequirementsOpen(true); }}
            onShowHelp={() => setIsHelpOpen(true)}
            onDownload={handleDownload}
            onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
         />

         <div className="flex-1 overflow-hidden relative">
            <Editor 
                ref={editorRef}
                content={content}
                onChange={setContent}
                isGenerating={generatorState === GeneratorState.WRITING}
                isRefinementActive={refinementState.isOpen}
                refinementContext={null}
                onSelectionAction={handleSelectionAction}
                onClearSelection={() => {}}
                contentUpdateTimestamp={contentUpdateTimestamp}
                theme={theme}
                viewMode={viewMode}
            />
         </div>

         {refinementState.isOpen && (
             <RefinementControl 
                onApply={handleRefineApply}
                onCancel={() => setRefinementState(prev => ({ ...prev, isOpen: false }))}
                onRefine={handleRefineRequest}
                generatedText={refinementState.generatedText}
                isGenerating={refinementState.isGenerating}
             />
         )}
      </div>

      {/* Global Requirements Modal */}
      {isRequirementsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <ClipboardList size={18} className="text-emerald-500"/>
                      {t('globalReq.title')}
                  </h3>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                  <p className="text-xs text-slate-500 mb-2">{t('globalReq.desc')}</p>
                  <textarea 
                      className="w-full h-40 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                      value={globalReqBuffer}
                      onChange={e => setGlobalReqBuffer(e.target.value)}
                      placeholder={t('globalReq.placeholder')}
                  />
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                  <button onClick={() => setIsRequirementsOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">{t('globalReq.cancel')}</button>
                  <button onClick={() => { setGlobalContext(globalReqBuffer); setIsRequirementsOpen(false); }} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">{t('globalReq.save')}</button>
              </div>
           </div>
        </div>
      )}

      {/* Help Modal */}
      <HelpModal 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title={t('writer.help.welcome')}
        subtitle={t('writer.help.subtitle')}
        steps={[
            { title: t('writer.help.step1.title'), description: t('writer.help.step1.desc'), icon: <ClipboardList size={20}/>, iconColorClass: 'bg-indigo-50 text-indigo-600' },
            { title: t('writer.help.step2.title'), description: t('writer.help.step2.desc'), icon: <SquarePen size={20}/>, iconColorClass: 'bg-emerald-50 text-emerald-600' },
            { title: t('writer.help.step3.title'), description: t('writer.help.step3.desc'), icon: <Code size={20}/>, iconColorClass: 'bg-amber-50 text-amber-600' }
        ]}
      />
    </div>
  );
};
