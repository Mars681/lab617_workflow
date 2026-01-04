import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FloatingMenu } from './FloatingMenu';
import { Bold, Italic, List, ListOrdered, Quote, Sigma, Check, FileCode, Type, Maximize } from 'lucide-react';
import TurndownService from 'turndown';
import { useTranslation } from 'react-i18next';

// Imported helpers from modular files
import { 
    processMarkdownWithMath, 
    createMathHtml, 
    buildCodeBlockElement, 
    getTurndownService,
    getLanguageFromCodeBlock,
    normalizeLanguage
} from './editor/renderers';

import { mountCodeWidget, mountMathWidget } from './editor/interactive';

// Declare hljs global from CDN
declare const hljs: any;

interface EditorProps {
  content: string;
  onChange: (newContent: string) => void;
  isGenerating: boolean;
  isRefinementActive: boolean;
  refinementContext: any;
  onSelectionAction: (selectedText: string, prefix: string, suffix: string, range?: { start: number; end: number }) => void;
  onClearSelection: () => void;
  contentUpdateTimestamp: number;
  theme?: string;
  viewMode?: 'preview' | 'source';
}

export interface EditorHandle {
  applyRefinement: (markdown: string, mode: 'replace' | 'insert') => boolean;
  scrollToSection: (title: string, slug?: string) => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(({ 
  content, 
  onChange,
  isGenerating, 
  isRefinementActive,
  onSelectionAction,
  contentUpdateTimestamp,
  theme = 'theme-lab',
  viewMode = 'preview'
}, ref) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const lastTimestampRef = useRef<number>(contentUpdateTimestamp);
  const lastSelectionRangeRef = useRef<Range | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentBlockFormat, setCurrentBlockFormat] = useState('p');
  const [scale, setScale] = useState(1);

  // New states for tools
  const [activePopup, setActivePopup] = useState<'math' | null>(null);
  
  const turndownService = useRef<TurndownService | null>(null);
  const lastCodeBlockRef = useRef<HTMLElement | null>(null);

  const adjustSourceTextareaHeight = useCallback(() => {
      if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
  }, []);

  const handleInput = useCallback(() => {
      if (viewMode === 'source') {
          if (textareaRef.current) {
              onChange(textareaRef.current.value);
              adjustSourceTextareaHeight();
          }
      } else {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          
          debounceRef.current = setTimeout(() => {
              if (editorRef.current && turndownService.current) {
                  const html = editorRef.current.innerHTML;
                  const md = turndownService.current.turndown(html);
                  onChange(md);
              }
          }, 300);
      }
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      updateToolbarState();
  }, [onChange, viewMode, adjustSourceTextareaHeight]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
      if (viewMode === 'source') return;
      e.preventDefault();
      
      const text = e.clipboardData.getData('text/plain');
      if (text) {
          try {
              const html = processMarkdownWithMath(text);
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              insertHtmlAtCursor(html);
          } catch (err) {
              console.error("Paste parsing error", err);
              document.execCommand('insertText', false, text);
          }
      }
  }, [viewMode]);

  const insertHtmlAtCursor = (html: string) => {
      if (viewMode === 'source') return;
      editorRef.current?.focus();
      document.execCommand('insertHTML', false, html);
      handleInput();
  };

  const insertHtmlBlockAfterCurrentLine = (html: string) => {
      if (viewMode === 'source') return;
      editorRef.current?.focus();

      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      
      const range = sel.getRangeAt(0);
      
      let currentBlock = range.endContainer.nodeType === Node.ELEMENT_NODE 
          ? range.endContainer as HTMLElement 
          : range.endContainer.parentElement;

      while (currentBlock && currentBlock.parentElement !== editorRef.current && currentBlock !== editorRef.current) {
          const tagName = currentBlock.tagName.toLowerCase();
          if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'blockquote'].includes(tagName)) {
              break;
          }
          if (!currentBlock.parentElement) break;
          currentBlock = currentBlock.parentElement;
      }

      if (currentBlock && editorRef.current?.contains(currentBlock)) {
          const newRange = document.createRange();
          newRange.selectNodeContents(currentBlock);
          newRange.collapse(false); 
          sel.removeAllRanges();
          sel.addRange(newRange);
          document.execCommand('insertParagraph', false);
          document.execCommand('insertHTML', false, html);
      } else {
          document.execCommand('insertHTML', false, html);
      }
      handleInput();
  };

  const getEditorRange = useCallback((): Range | null => {
      if (viewMode === 'source') return null;
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return null;
      const range = sel.getRangeAt(0);
      if (editorRef.current && !editorRef.current.contains(range.commonAncestorContainer)) return null;
      return range;
  }, [viewMode]);

  const getClosestMathWrapper = useCallback((node: Node | null): HTMLElement | null => {
      if (!node) return null;
      const element = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;
      return element?.closest('.math-jax-wrapper') as HTMLElement | null;
  }, []);

  const getClosestCodeBlock = useCallback((node: Node | null): HTMLElement | null => {
      if (!node) return null;
      const element = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;
      return element?.closest('.code-block-wrapper') as HTMLElement | null;
  }, []);

  const placeCaretInsideCode = (codeEl: HTMLElement) => {
    const range = document.createRange();
    range.selectNodeContents(codeEl);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const updateCodeBlockLanguage = useCallback((block: HTMLElement, language: string) => {
      const lang = normalizeLanguage(language);
      const codeEl = block.querySelector('code');
      const labelEl = block.querySelector('.code-header span');

      if (labelEl) labelEl.textContent = lang;
      if (codeEl) {
          const baseClasses = (codeEl.className || '').split(/\s+/).filter(Boolean).filter(c => !c.startsWith('language-') && c !== 'hljs');
          codeEl.className = [...baseClasses, 'hljs', `language-${lang}`].join(' ').trim();
          if (typeof hljs !== 'undefined' && hljs.highlightElement) {
              try { hljs.highlightElement(codeEl); } catch (e) { /* ignore */ }
          }
      }
  }, []);

  const findCodeBlockFromRange = useCallback((range?: Range | null): HTMLElement | null => {
      const targetRange = range || getEditorRange();
      if (!targetRange) return null;
      const node = targetRange.commonAncestorContainer;
      const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
      if (!element) return null;
      return element.closest('.code-block-wrapper') as HTMLElement | null;
  }, [getEditorRange]);

  const insertParagraphAfter = useCallback((element: HTMLElement) => {
      if (!element.parentNode) return null;
      const paragraph = document.createElement('p');
      paragraph.appendChild(document.createElement('br'));
      element.parentNode.insertBefore(paragraph, element.nextSibling);
      return paragraph;
  }, []);

  const toggleMathTool = () => {
      if (activePopup === 'math') setActivePopup(null);
      else setActivePopup('math');
  };

  const insertMathInline = () => {
      const html = createMathHtml('E=mc^2', false);
      insertHtmlAtCursor(html);
      setActivePopup(null);
  };

  const insertMathBlock = () => {
      const html = createMathHtml('E=mc^2', true);
      insertHtmlBlockAfterCurrentLine(html);
      setActivePopup(null);
  };

  const insertCodeBlock = () => {
      if (viewMode === 'source') return;

      let targetRange = getEditorRange();

      if (!targetRange && editorRef.current) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          targetRange = range;
      }

      if (!targetRange) return;

      const existingBlock = findCodeBlockFromRange(targetRange);
      if (existingBlock) return;

      const defaultLang = 'python';
      const selectedText = targetRange.toString();
      const { wrapper } = buildCodeBlockElement(selectedText, defaultLang);
      
      const tempId = 'temp-code-' + Date.now();
      wrapper.id = tempId;

      insertHtmlBlockAfterCurrentLine(wrapper.outerHTML);
      
      setTimeout(() => {
          if (editorRef.current) {
              const inserted = editorRef.current.querySelector(`#${tempId}`) as HTMLElement;
              if (inserted) {
                  inserted.removeAttribute('id');
                  mountCodeWidget(inserted, selectedText, defaultLang, handleInput);
              }
          }
      }, 0);
      
      handleInput();
  };

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
      if (viewMode === 'source') return;
      const target = e.target as HTMLElement;
      
      const codeWrapper = target.closest('.code-block-wrapper') as HTMLElement;
      if (codeWrapper && editorRef.current?.contains(codeWrapper)) {
          if (target.closest('.code-header') || target.closest('.code-lang-control')) return;
          if (codeWrapper.classList.contains('editing-code')) return;

          e.preventDefault();
          e.stopPropagation();

          const pre = codeWrapper.querySelector('pre');
          const codeEl = codeWrapper.querySelector('code');
          if (!pre || !codeEl) return;

          const currentLang = getLanguageFromCodeBlock(codeWrapper) || 'text';
          const currentCode = codeEl.textContent || '';

          mountCodeWidget(codeWrapper, currentCode, currentLang, handleInput);
          return;
      }

      const mathWrapper = target.closest('.math-jax-wrapper') as HTMLElement;
      if (mathWrapper && editorRef.current?.contains(mathWrapper)) {
          e.preventDefault();
          e.stopPropagation();

          if (mathWrapper.classList.contains('editing-math')) return;

          const tex = mathWrapper.getAttribute('data-tex') || '';
          const isBlock = mathWrapper.classList.contains('block');

          mountMathWidget(mathWrapper, tex, isBlock, handleInput);
      }
  }, [viewMode, handleInput]);

  const updateToolbarState = () => {
      const block = document.queryCommandValue('formatBlock');
      if (block) setCurrentBlockFormat(block.toLowerCase());
      else setCurrentBlockFormat('p');
  };

  const handleCtrlEnter = useCallback((e: React.KeyboardEvent) => {
      if (viewMode === 'source' || !(e.ctrlKey || e.metaKey) || e.key !== 'Enter') return;

      const range = getEditorRange();
      if (!range) return;

      const codeBlock = findCodeBlockFromRange(range);
      if (codeBlock) {
          const paragraph = insertParagraphAfter(codeBlock);
          if (paragraph) {
              const newRange = document.createRange();
              newRange.selectNodeContents(paragraph);
              newRange.collapse(true);
              const sel = window.getSelection();
              if (sel) {
                  sel.removeAllRanges();
                  sel.addRange(newRange);
              }
              e.preventDefault();
              handleInput();
          }
          return;
      }

      const mathWrapper = getClosestMathWrapper(range.commonAncestorContainer);
      if (mathWrapper && editorRef.current) {
          const paragraph = insertParagraphAfter(mathWrapper);
          if (paragraph) {
              const newRange = document.createRange();
              newRange.selectNodeContents(paragraph);
              newRange.collapse(true);
              const sel = window.getSelection();
              if (sel) {
                  sel.removeAllRanges();
                  sel.addRange(newRange);
              }
              e.preventDefault();
              handleInput();
          }
      }
  }, [viewMode, getEditorRange, findCodeBlockFromRange, getClosestMathWrapper, insertParagraphAfter, handleInput]);

  const execCmd = (command: string, value?: string) => {
    if (viewMode === 'source') return;
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateToolbarState();
    handleInput();
  };

  const handleFormatBlock = (tag: string) => {
    execCmd('formatBlock', tag);
  };

  const handleEditRequest = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    
    const range = sel.getRangeAt(0);
    const text = range.toString();
    if (!text.trim()) return;

    lastSelectionRangeRef.current = range.cloneRange();

    let prefix = '';
    let suffix = '';

    if (editorRef.current) {
        try {
            const preRange = document.createRange();
            preRange.selectNodeContents(editorRef.current);
            preRange.setEnd(range.startContainer, range.startOffset);
            prefix = preRange.toString();

            const postRange = document.createRange();
            postRange.selectNodeContents(editorRef.current);
            postRange.setStart(range.endContainer, range.endOffset);
            suffix = postRange.toString();
        } catch (e) {
            console.warn("Selection context error", e);
        }
    }

    onSelectionAction(text, prefix, suffix, { start: 0, end: 0 });
    setMenuPosition(null);
  };

  const checkSelection = useCallback(() => {
      if (viewMode === 'source' || isGenerating) {
          setMenuPosition(null);
          return;
      }
      
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || sel.rangeCount === 0) {
          setMenuPosition(null);
          return;
      }

      const range = sel.getRangeAt(0);
      if (editorRef.current && !editorRef.current.contains(range.commonAncestorContainer)) {
          setMenuPosition(null);
          return;
      }

      const text = range.toString().trim();
      if (!text) {
          setMenuPosition(null);
          return;
      }

      const rect = range.getBoundingClientRect();
      setMenuPosition({
          top: rect.top,
          left: rect.left + (rect.width / 2)
      });
  }, [viewMode, isGenerating]);

  useImperativeHandle(ref, () => ({
    applyRefinement: (markdown: string, mode: 'replace' | 'insert'): boolean => {
        if (viewMode === 'source' && textareaRef.current) {
            const current = textareaRef.current.value;
            const newContent = mode === 'replace' ? markdown : current + "\n" + markdown;
            textareaRef.current.value = newContent;
            onChange(newContent);
            adjustSourceTextareaHeight();
            return true;
        }

        if (!lastSelectionRangeRef.current || !editorRef.current) return false;
        
        const range = lastSelectionRangeRef.current;
        if (!editorRef.current.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== editorRef.current) {
            return false;
        }

        try {
            const html = processMarkdownWithMath(markdown || '');
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }

            if (mode === 'replace') {
                document.execCommand('insertHTML', false, html);
            } else {
                range.collapse(false);
                sel?.removeAllRanges();
                sel?.addRange(range);
                document.execCommand('insertHTML', false, html);
            }

            handleInput();
            lastSelectionRangeRef.current = null;
            return true;
        } catch (e) {
            console.error("DOM Edit Error", e);
            return false;
        }
    },
    scrollToSection: (title: string, slug?: string) => {
        const searchText = title.trim();
        if (!searchText) return;

        if (viewMode === 'preview' && editorRef.current) {
            // Priority 1: ID Match (Precise)
            let target: Element | null = null;
            if (slug) {
                // Safely query element by ID even if it contains numbers or special chars
                target = document.getElementById(slug);
            }

            // Priority 2: Text Match (Fallback)
            if (!target) {
                const headings = Array.from(editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                target = headings.find(h => (h.textContent || '').trim() === searchText) || 
                         headings.find(h => (h.textContent || '').includes(searchText)) || null;
            }

            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Visual Highlight
                target.classList.add('bg-yellow-200/50', 'dark:bg-yellow-500/30', 'transition-colors', 'duration-1000', 'rounded');
                setTimeout(() => target.classList.remove('bg-yellow-200/50', 'dark:bg-yellow-500/30'), 2000);
            }
        } else if (viewMode === 'source' && textareaRef.current) {
            const value = textareaRef.current.value;
            // Escaped for regex safety
            const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Allow loose matching: "# ... Title ..." to support markdown formatting in headers
            const regex = new RegExp(`^#{1,6}\\s+.*${escaped}.*`, 'im');
            const match = value.match(regex);
            
            if (match && match.index !== undefined) {
                const textarea = textareaRef.current;
                textarea.focus();
                
                // Set selection to highlight the line
                textarea.setSelectionRange(match.index, match.index + match[0].length);
                
                // Attempt to scroll to line
                // Calculate line number
                const linesUpToMatch = value.substring(0, match.index).split('\n').length;
                // Approximate line height (fallback)
                const lineHeight = 21; 
                // Scroll
                textarea.scrollTop = (linesUpToMatch - 3) * lineHeight;
                
                // Blur and focus usually forces a scroll to cursor if custom scroll logic fails
                textarea.blur();
                textarea.focus();
            }
        }
    }
  }));

  // Initialize Turndown via helper
  useEffect(() => {
    if (!turndownService.current) {
        turndownService.current = getTurndownService();
    }
  }, []);

  useEffect(() => {
    const isExternalUpdate = contentUpdateTimestamp !== lastTimestampRef.current;
    
    if (viewMode === 'source') {
        if (textareaRef.current && (isExternalUpdate || textareaRef.current.value !== content)) {
            textareaRef.current.value = content;
            adjustSourceTextareaHeight();
        }
    } else {
        if (editorRef.current) {
            const isEmpty = editorRef.current.innerHTML.trim() === '';
            const hasContent = content && content.trim().length > 0;
            
            if (isGenerating || isExternalUpdate || (isEmpty && hasContent)) {
                const rawHtml = processMarkdownWithMath(content || '');
                if (editorRef.current.innerHTML !== rawHtml) {
                    editorRef.current.innerHTML = rawHtml;
                }
            }
        }
    }
    
    if (isExternalUpdate) {
        lastTimestampRef.current = contentUpdateTimestamp;
    }
  }, [content, isGenerating, contentUpdateTimestamp, viewMode, adjustSourceTextareaHeight]);

  useEffect(() => {
      if (viewMode === 'source') {
          setTimeout(adjustSourceTextareaHeight, 0);
      }
  }, [viewMode, adjustSourceTextareaHeight]);

  return (
    <div className="h-full relative flex flex-col font-sans" ref={containerRef}>
      <div className="editor-toolbar flex items-center gap-1 p-2 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-20 shrink-0 overflow-x-auto transition-colors">
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-slate-600 mr-2">
              <select 
                className="h-8 px-2 text-xs border border-gray-200 dark:border-slate-600 rounded hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-700 text-gray-700 dark:text-slate-200 cursor-pointer min-w-[120px] transition-colors disabled:opacity-50"
                onChange={(e) => handleFormatBlock(e.target.value)}
                value={currentBlockFormat}
                disabled={viewMode === 'source'}
              >
                  <option value="p">{t('toolbar.normal')}</option>
                  <option value="h1">{t('toolbar.h1')}</option>
                  <option value="h2">{t('toolbar.h2')}</option>
                  <option value="h3">{t('toolbar.h3')}</option>
                  <option value="blockquote">{t('toolbar.quote')}</option>
              </select>
          </div>
          <div className={`${viewMode === 'source' ? 'opacity-50 pointer-events-none grayscale' : ''} flex gap-1 items-center relative`}>
            <ToolbarBtn icon={<Bold size={16}/>} label={t('toolbar.bold')} onClick={() => execCmd('bold')} />
            <ToolbarBtn icon={<Italic size={16}/>} label={t('toolbar.italic')} onClick={() => execCmd('italic')} />
            <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />
            <ToolbarBtn icon={<List size={16}/>} label={t('toolbar.ul')} onClick={() => execCmd('insertUnorderedList')} />
            <ToolbarBtn icon={<ListOrdered size={16}/>} label={t('toolbar.ol')} onClick={() => execCmd('insertOrderedList')} />
            <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />
            
            <div className="relative">
              <ToolbarBtn 
                icon={<Sigma size={16} className={activePopup === 'math' ? 'text-indigo-500' : ''} />} 
                label={t('toolbar.formula')} 
                onClick={toggleMathTool} 
              />
            </div>

            <div className="relative">
              <ToolbarBtn 
                icon={<FileCode size={16} />} 
                label={t('toolbar.code')} 
                onClick={insertCodeBlock} 
              />
            </div>
          </div>
          
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-2 text-xs text-slate-400 font-mono">
             <span>{Math.round(scale * 100)}%</span>
             {scale !== 1 && (
                 <button 
                    onClick={() => setScale(1)} 
                    className="hover:text-indigo-500 transition-colors"
                    title="Reset Zoom"
                 >
                    Reset
                 </button>
             )}
          </div>
      </div>

      {activePopup && (
        <div className="absolute top-12 left-4 z-30">
           {activePopup === 'math' && (
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-1.5 flex gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
               <button onClick={insertMathInline} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs font-medium text-slate-700 dark:text-slate-200">
                 <Type size={14} /> Inline ($)
               </button>
               <div className="w-px bg-slate-200 dark:bg-slate-700 my-1"/>
               <button onClick={insertMathBlock} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs font-medium text-slate-700 dark:text-slate-200">
                 <Maximize size={14} /> Block ($$)
               </button>
             </div>
           )}
        </div>
      )}

      <div 
        className="flex-1 overflow-auto relative bg-white dark:bg-slate-900 cursor-text transition-colors" 
        onClick={(e) => {
            if (activePopup) {
                setActivePopup(null);
            }
            if (e.target === scrollContainerRef.current) {
                if (viewMode === 'source') textareaRef.current?.focus();
                else editorRef.current?.focus();
            }
            handleEditorClick(e);
        }}
        ref={scrollContainerRef}
      >
          <div className="min-h-full w-full">
            {viewMode === 'source' ? (
                <div 
                    key="source-mode"
                    className="min-h-full w-full origin-top-left p-0"
                    style={{ transform: `scale(${scale})`, width: `calc(100% / ${scale})` }}
                >
                    <textarea 
                        ref={textareaRef}
                        className="w-full min-h-[calc(100vh-150px)] p-8 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono text-sm leading-relaxed resize-none focus:outline-none overflow-hidden block"
                        placeholder="# Markdown Source Mode"
                        spellCheck={false}
                        onChange={handleInput}
                        onSelect={() => {}}
                    />
                </div>
            ) : (
                <div 
                    key="preview-mode"
                    ref={editorRef}
                    className={`editor-content ${theme} focus:outline-none min-h-[calc(100vh-150px)] transition-transform duration-75 ease-out origin-top-left`}
                    style={{ 
                        transform: `scale(${scale})`, 
                        width: `calc(100% / ${scale})`,
                        maxWidth: 'none',
                        margin: 0,
                        boxShadow: 'none',
                        padding: '4rem'
                    }}
                    contentEditable={!isGenerating}
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onKeyDown={handleCtrlEnter}
                    onMouseUp={checkSelection}
                    onKeyUp={(e) => {
                        updateToolbarState();
                        checkSelection();
                    }}
                    suppressContentEditableWarning={true}
                    data-placeholder={t('editor.placeholder')}
                />
            )}
          </div>
      </div>

      <div className="floating-menu">
        <FloatingMenu 
            position={menuPosition} 
            onClose={() => setMenuPosition(null)}
            onEditRequest={handleEditRequest}
        />
      </div>
    </div>
  );
});

const ToolbarBtn = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button 
        onMouseDown={(e) => { e.preventDefault(); onClick(); }} 
        className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 rounded-md transition-all"
        title={label}
    >
        {icon}
    </button>
);