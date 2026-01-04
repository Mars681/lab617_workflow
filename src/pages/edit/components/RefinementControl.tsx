
import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, Sparkles, Check, X, Trash2, GripHorizontal, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useTranslation } from 'react-i18next';

interface RefinementControlProps {
  onApply: (newText: string, mode: 'replace' | 'insert') => void;
  onCancel: () => void;
  onRefine: (instruction: string) => Promise<void>;
  generatedText: string;
  isGenerating: boolean;
}

// Helper to preprocess various latex formats for ReactMarkdown
const preprocessMath = (content: string) => {
  if (!content) return '';

  // Replace \[ ... \] with $$ ... $$
  const blockMath = content.replace(
    /(?:\\\[|\\\\\[)([\s\S]*?)(?:\\\]|\\\\\])/g,
    (_, equation) => `\n$$\n${equation}\n$$\n`
  );

  // Replace \( ... \) with $ ... $
  const inlineMath = blockMath.replace(
    /(?:\\\([ \t]*|\\\\\([ \t]*)([\s\S]*?)(?:\\\)|\\\\\))/g,
    (_, equation) => `$${equation}$`
  );

  return inlineMath;
};

export const RefinementControl: React.FC<RefinementControlProps> = ({
  onApply,
  onCancel,
  onRefine,
  generatedText,
  isGenerating
}) => {
  const { t } = useTranslation();
  const [instruction, setInstruction] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
      x: Math.max(0, window.innerWidth / 2 - 300),
      y: Math.max(0, window.innerHeight / 2 - 200)
  }));
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    if (generatedText) setHasGenerated(true);
  }, [generatedText]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('textarea') || 
        (e.target as HTMLElement).closest('input')) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      const boundedY = Math.max(0, Math.min(window.innerHeight - 50, newY));
      const boundedX = Math.max(-200, Math.min(window.innerWidth - 100, newX));
      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => { setIsDragging(false); };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    await onRefine(instruction);
  };

  return (
    <div 
        ref={windowRef}
        className="refinement-control fixed z-50 flex flex-col font-sans animate-in zoom-in-95 duration-200"
        style={{ top: position.y, left: position.x, width: '600px', maxHeight: '80vh' }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden ring-1 ring-black/5">
        <div 
            className="h-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between px-3 cursor-move shrink-0 select-none"
            onMouseDown={handleMouseDown}
        >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Sparkles size={14} className="text-indigo-500" />
                {t('menu.aiRefine')}
            </div>
            <div className="flex items-center gap-1">
                 <GripHorizontal size={14} className="text-slate-300 mr-2" />
                 <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors">
                    <X size={16} />
                 </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[100px] bg-white p-5 relative" ref={contentRef}>
           {isGenerating && !generatedText && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 space-y-3">
                <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="text-sm text-indigo-600 font-medium animate-pulse">{t('refine.generating')}</div>
             </div>
           )}

           {!hasGenerated && !isGenerating && (
             <div className="text-center text-slate-400 py-8">
                <p className="text-sm">{t('refine.placeholder')}</p>
             </div>
           )}

           {(hasGenerated || generatedText) && (
              <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-indigo-600">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[[rehypeKatex, { output: 'html', throwOnError: false }]]}
                >
                    {preprocessMath(generatedText)}
                </ReactMarkdown>
              </div>
           )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
           <form onSubmit={handleSubmit} className="relative">
              <textarea
                ref={inputRef}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); }}}
                placeholder={hasGenerated ? "..." : t('placeholder.input')}
                className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-10 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none shadow-sm transition-all"
                rows={1}
                style={{ minHeight: '46px', maxHeight: '100px' }}
                disabled={isGenerating}
              />
              <button 
                type="submit"
                disabled={!instruction.trim() || isGenerating}
                className="absolute right-1.5 bottom-1.5 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-sm"
              >
                <ArrowUp size={16} />
              </button>
           </form>
           
           {hasGenerated && !isGenerating && (
              <div className="mt-3 flex items-center justify-between animate-in slide-in-from-bottom-1">
                  <button onClick={() => setInstruction('')} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-200 transition-colors">
                      <Trash2 size={12} /> {t('menu.clear')}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-md transition-colors">{t('refine.btn.discard')}</button>
                    <button onClick={() => onApply(generatedText, 'insert')} className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex items-center gap-1.5 shadow-sm transition-all">
                        <ArrowDown size={14} /> {t('refine.btn.insert')}
                    </button>
                    <button onClick={() => onApply(generatedText, 'replace')} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center gap-1.5 shadow-sm transition-all active:scale-95">
                        <Check size={14} /> {t('refine.btn.replace')}
                    </button>
                  </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
