
import React, { useState, useMemo, useEffect } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageContentProps {
  content: string;
  isStreaming: boolean;
  showThoughts?: boolean;
}

// ----------------------------------------------------------------------
// Helper: Hook to detect dark mode
// ----------------------------------------------------------------------

const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
        return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

// ----------------------------------------------------------------------
// Helper: Extract Chain of Thought
// ----------------------------------------------------------------------

const extractThought = (raw: string) => {
  if (!raw) return { thought: null as string | null, main: '' };

  // 1) Explicit <think> tags (DeepSeek style)
  const thinkStart = raw.indexOf('<think>');
  if (thinkStart !== -1) {
    const thinkEnd = raw.indexOf('</think>');
    const pre = raw.substring(0, thinkStart);
    if (thinkEnd !== -1) {
      const thought = raw.substring(thinkStart + 7, thinkEnd);
      const post = raw.substring(thinkEnd + 8);
      return { thought, main: (pre + '\n' + post).trim() };
    }
    return { thought: raw.substring(thinkStart + 7), main: pre.trim() };
  }

  // 2) Heuristic: Reasoning section at the top
  const reasoningRegex = /^(?:Reasoning|Thoughts?|Analysis|思考过程|思维链)[:：]\s*\n?([\s\S]+?)(?:\n{2,}|$)/i;
  const match = raw.match(reasoningRegex);
  if (match) {
    const thought = match[1].trim();
    const main = raw.replace(reasoningRegex, '').trim();
    return { thought, main };
  }

  return { thought: null as string | null, main: raw };
};

// ----------------------------------------------------------------------
// Helper: Preprocess LaTeX for remark-math
// ----------------------------------------------------------------------

const preprocessMath = (content: string) => {
  if (!content) return '';

  const blockMath = content.replace(
    /(?:\\\[|\\\\\[)([\s\S]*?)(?:\\\]|\\\\\])/g,
    (_, equation) => `\n$$\n${equation}\n$$\n`
  );

  const inlineMath = blockMath.replace(
    /(?:\\\([ \t]*|\\\\\([ \t]*)([\s\S]*?)(?:\\\)|\\\\\))/g,
    (_, equation) => `$${equation}$`
  );

  return inlineMath;
};

// ----------------------------------------------------------------------
// Component: CodeBlock
// ----------------------------------------------------------------------

const CodeBlock: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => {
  const [copied, setCopied] = useState(false);
  const isDark = useIsDarkMode();

  const raw = String(children).replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';

  const handleCopy = () => {
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs font-mono
                      bg-slate-100 dark:bg-[#1e1e1e]
                      text-slate-600 dark:text-slate-300
                      border-b border-slate-200 dark:border-slate-700">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="px-2 py-0.5 rounded text-[11px]
                     border border-slate-300 dark:border-slate-600
                     hover:bg-slate-200 dark:hover:bg-slate-700
                     transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        language={language}
        style={isDark ? vscDarkPlus : oneLight}
        wrapLongLines={false}   // ❗关键：不要逐行包裹
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: 1.6
        }}
        codeTagProps={{
          style: {
            background: 'transparent'
          }
        }}
        PreTag={({ children, ...props }) => (
          <pre
            {...props}
            style={{
              background: isDark ? '#1e1e1e' : '#fafafa',
              margin: 0
            }}
          >
            {children}
          </pre>
        )}
      >
        {raw}
      </SyntaxHighlighter>
    </div>
  );
};

// ----------------------------------------------------------------------
// Main Component: MessageContent
// ----------------------------------------------------------------------

const MessageContent: React.FC<MessageContentProps> = ({ content, isStreaming, showThoughts = true }) => {
  const [isExpanded, setIsExpanded] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [isStreaming]);
  
  const { thought, processedMain } = useMemo(() => {
    const { thought, main } = extractThought(content);
    const processedMain = preprocessMath(main);
    return { thought, processedMain };
  }, [content]);

  return (
    <div className="w-full min-w-0 chat-content">
       {/* Thought Process Section */}
       {thought && showThoughts && (
         <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="group border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl overflow-hidden">
              <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100/30 dark:bg-indigo-900/20 cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 transition-colors select-none"
              >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Brain size={14} className={`shrink-0 ${isStreaming && content.indexOf('</think>') === -1 ? 'animate-pulse' : ''}`} />
                  <span>
                    {isStreaming && content.indexOf('</think>') === -1 
                        ? 'Thinking...' 
                        : (isExpanded ? 'Chain of Thought' : 'Thought Process (Collapsed)')}
                  </span>
              </div>
              
              {isExpanded && (
                <div className="px-4 py-3 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-800 border-t border-indigo-100/50 dark:border-indigo-900/20">
                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap font-mono text-[13px]">
                        {thought}
                    </div>
                </div>
              )}
            </div>
         </div>
       )}

       {/* Main Content Section */}
       {processedMain || (!thought && !processedMain) ? (
           <div className="markdown-body prose prose-slate dark:prose-invert max-w-none">
               {(!processedMain && isStreaming) ? (
                   <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                       <div className="w-2 h-4 bg-indigo-400 rounded-sm"></div>
                       <span className="text-sm">Thinking...</span>
                   </div>
               ) : (
                   <ReactMarkdown 
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[[rehypeKatex, { output: 'html', throwOnError: false }]]}
                        components={{
                            code({node, className, children, ...props}) {
                                const match = /language-(\w+)/.exec(className || '');
                                const isMultiLine = String(children).includes('\n');
                                
                                if (isMultiLine || match) {
                                  return (
                                    <CodeBlock className={className}>
                                        {children}
                                    </CodeBlock>
                                  );
                                }
                                return (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                            },
                            table({children}) {
                                return (
                                    <div className="overflow-x-auto my-4 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                            {children}
                                        </table>
                                    </div>
                                );
                            },
                            thead({children}) {
                                return <thead className="bg-slate-50 dark:bg-slate-800/50">{children}</thead>;
                            },
                            th({children}) {
                                return <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{children}</th>;
                            },
                            td({children}) {
                                return <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">{children}</td>;
                            },
                            a({children, href}) {
                                return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline decoration-indigo-300 underline-offset-2 transition-colors">{children}</a>
                            },
                            blockquote({children}) {
                                return <blockquote className="border-l-4 border-indigo-300 dark:border-indigo-700 pl-4 py-1 italic bg-slate-50 dark:bg-slate-800/30 rounded-r-lg my-4">{children}</blockquote>
                            }
                       }}
                   >
                       {processedMain}
                   </ReactMarkdown>
               )}
           </div>
       ) : null}
    </div>
  );
};

export default MessageContent;
